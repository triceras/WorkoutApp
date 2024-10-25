import os
import replicate
import logging
from .models import WorkoutPlan
from .exceptions import AIServiceUnavailable, ImageGenerationError
from uuid import uuid4
import base64
from django.conf import settings

logger = logging.getLogger(__name__)

def is_valid_url(url):
    if hasattr(url, 'url'):  # Check if it's a FileOutput object
        url = url.url
    if not isinstance(url, str):
        return False
    import re
    regex = re.compile(
        r'^(?:http|ftp)s?://'
        r'\S+$', re.IGNORECASE)
    return re.match(regex, url) is not None

def save_base64_image(base64_string):
    image_data = base64.b64decode(base64_string.split(',')[1])
    filename = f"{uuid4()}.png"
    save_path = os.path.join(settings.MEDIA_ROOT, 'generated_images', filename)
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    with open(save_path, 'wb') as f:
        f.write(image_data)
    return f"{settings.MEDIA_URL}generated_images/{filename}"

def process_file_output(file_output):
    """Process file output from Replicate API if returned as base64 or file object."""
    if isinstance(file_output, str) and file_output.startswith('data:image'):
        # Handle base64 string
        return save_base64_image(file_output)
    else:
        # Handle other file-like outputs if necessary
        raise ImageGenerationError(f"Unexpected file output format: {type(file_output)}")

def generate_image(prompt: str, num_images: int = 1) -> list:
    """Generates images using Replicate's API based on the provided prompt."""
    try:
        # Retrieve Replicate API token from environment variables
        api_token = os.getenv('REPLICATE_API_TOKEN')
        if not api_token:
            raise ImageGenerationError("Replicate API token not set in environment variables.")

        # Initialize Replicate client
        replicate_client = replicate.Client(api_token=api_token)

        # Specify the correct model version
        model_version = "black-forest-labs/flux-schnell"  # Update to the correct model version

        logger.debug(f"Generating {num_images} image(s) with prompt: '{prompt}'")

        # Generate images using replicate.run()
        outputs = replicate_client.run(
            model_version,
            input={
                "prompt": prompt,
                "num_outputs": num_images
            }
        )

        logger.debug(f"Replicate API response: {outputs}")

        image_urls = []
        if isinstance(outputs, list):
            for output in outputs:
                if isinstance(output, str) and is_valid_url(output):
                    image_urls.append(output)
                elif hasattr(output, 'url'):
                    image_urls.append(output.url)
                elif isinstance(output, dict) and 'url' in output:
                    image_urls.append(output['url'])
                else:
                    logger.warning(f"Unexpected output type: {type(output)}")
        elif isinstance(outputs, dict) and 'output' in outputs:
            for output in outputs['output']:
                if isinstance(output, str) and is_valid_url(output):
                    image_urls.append(output)
                elif hasattr(output, 'url'):
                    image_urls.append(output.url)
                elif isinstance(output, dict) and 'url' in output:
                    image_urls.append(output['url'])
                else:
                    logger.warning(f"Unexpected output type: {type(output)}")

        if not image_urls:
            raise ImageGenerationError("No valid image URLs generated")

        logger.info(f"Generated {len(image_urls)} image(s) for prompt: '{prompt}'")
        logger.debug(f"Generated image URLs: {image_urls}")
        return image_urls

    except Exception as e:
        logger.error(f"Replicate API error: {e}")
        raise ImageGenerationError(f"Replicate API error: {e}")


def generate_and_assign_backgrounds(user) -> dict:
    try:
        workout_plan = user.workout_plans.order_by('-created_at').first()
        if not workout_plan:
            logger.error(f"No WorkoutPlan found for user {user.username}")
            raise ImageGenerationError("No WorkoutPlan found to assign backgrounds.")

        if workout_plan.dashboard_background and workout_plan.workoutplan_background:
            logger.info(f"Dashboard background URL: {workout_plan.dashboard_background}")
            logger.info(f"Workout plan background URL: {workout_plan.workoutplan_background}")
            logger.info(f"Using existing background images for WorkoutPlan ID {workout_plan.id} for user {user.username}")
            return {
                "dashboard_background": workout_plan.dashboard_background.url,
                "workoutplan_background": workout_plan.workoutplan_background.url
            }

        dashboard_prompt = "A vibrant and colorful gym interior with weights, treadmills, and people exercising, perfect as a dashboard background for a fitness app."
        workoutplan_prompt = "An inspiring and energetic gym scene with dumbbells, resistance bands, and motivated individuals, ideal as a workout plan background for a fitness application."

        dashboard_images = generate_image(prompt=dashboard_prompt, num_images=1)
        workoutplan_images = generate_image(prompt=workoutplan_prompt, num_images=1)

        if not dashboard_images or not workoutplan_images:
            logger.error("Failed to generate one or both background images.")
            raise ImageGenerationError("Failed to generate background images.")

        dashboard_bg = dashboard_images[0]
        workoutplan_bg = workoutplan_images[0]

        workout_plan.save_image_from_url('dashboard_background', dashboard_bg)
        workout_plan.save_image_from_url('workoutplan_background', workoutplan_bg)

        logger.info(f"Background images assigned for WorkoutPlan ID {workout_plan.id} for user {user.username}")

        return {
            "dashboard_background": workout_plan.dashboard_background.url,
            "workoutplan_background": workout_plan.workoutplan_background.url
        }

    except ImageGenerationError as e:
        logger.error(f"Failed to generate and assign backgrounds: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error in generate_and_assign_backgrounds: {e}")
        raise ImageGenerationError(f"Unexpected error: {e}")
