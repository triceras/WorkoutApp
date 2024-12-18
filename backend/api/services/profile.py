"""
Services for user profile management.
"""

import logging
import replicate
import time
from django.core.files.base import ContentFile
from django.conf import settings
from celery import shared_task
import requests

logger = logging.getLogger(__name__)

def generate_profile_picture_async(user):
    """
    Asynchronously generate a profile picture for a user using Replicate.
    """
    from ..tasks import generate_profile_picture_task
    logger.info(f"Queueing profile picture generation for user {user.id}")
    generate_profile_picture_task.delay(user.id)

def generate_profile_picture(user):
    """
    Generate a profile picture for a user using Replicate's Stable Diffusion model.
    """
    try:
        logger.info(f"Starting profile picture generation for user {user.id}")
        client = replicate.Client(api_token=settings.REPLICATE_API_TOKEN)
        logger.info("Replicate client initialized successfully")

        # Generate appropriate prompt based on user's sex
        if user.sex == "Male":
            prompt = ("A professional headshot of an athletic male in workout clothes, "
                     "determined expression, natural lighting, studio background")
        else:
            prompt = ("A professional headshot of an athletic female in workout clothes, "
                     "determined expression, natural lighting, studio background")

        # Run the model
        output = client.run(
            "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
            input={
                "prompt": prompt,
                "negative_prompt": "deformed, distorted, disfigured, poor anatomy, bad hands, missing fingers, extra limbs, bad lighting",
                "width": 512,
                "height": 512,
                "num_outputs": 1,
                "guidance_scale": 7.5,
                "num_inference_steps": 50,
            }
        )

        if output and len(output) > 0:
            image_url = output[0]
            logger.info(f"Successfully generated image for user {user.id}")

            # Download the image
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = requests.get(image_url)
                    response.raise_for_status()
                    
                    # Save the image to the user's profile
                    image_name = f"profile_picture_{user.id}.png"
                    user.profile_picture.save(
                        image_name,
                        ContentFile(response.content),
                        save=True
                    )
                    logger.info(f"Successfully saved profile picture for user {user.id}")
                    return True
                    
                except requests.RequestException as e:
                    logger.error(f"Request error on attempt {attempt + 1}: {str(e)}")
                    if attempt < max_retries - 1:
                        time.sleep(1)
            
            logger.error(f"All download attempts failed for user {user.id}")
            return False

        else:
            logger.error(f"No output generated for user {user.id}")
            return False

    except Exception as e:
        logger.error(f"Error generating profile picture for user {user.id}: {str(e)}")
        return False
