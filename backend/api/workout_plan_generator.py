# import replicate
# import os

# def generate_workout_plan(user):
#     # Access UserProfile attributes
#     user_profile = user.userprofile
#     age = user_profile.age
#     weight = user_profile.weight
#     height = user_profile.height
#     fitness_level = user_profile.fitness_level
#     strength_goals = user_profile.strength_goals
#     equipment = user_profile.equipment
#     workout_days = user_profile.workout_days
#     workout_time = user_profile.workout_time

#     # Create the prompt
#     prompt = create_prompt({
#         'age': age,
#         'weight': weight,
#         'height': height,
#         'fitness_level': fitness_level,
#         'strength_goals': strength_goals,
#         'equipment': equipment,
#         'workout_days': workout_days,
#         'workout_time': workout_time,
#     })

#     # Initialize Replicate client with your API token
#     # replicate_api_token = os.environ.get('REPLICATE_API_TOKEN')
#     # if not replicate_api_token:
#     #     print("Replicate API token not found.")
#     #     return None

#     # client = replicate.Client(api_token=replicate_api_token)

#     try:
#         # Use the accessible model
#         output = replicate.run(
#             "meta/meta-llama-3-70b-instruct",
#             input={"prompt": prompt}
#         )

#         print(f"This is the Replicate returned values {output}")

#         # Parse the AI response
#         workout_plan = parse_ai_response({'output': output})

#         return workout_plan

#     except replicate.exceptions.ReplicateException as e:
#         print(f"Error generating workout plan: {e}")
#         return None
#     except Exception as e:
#         print(f"Error generating workout plan: {e}")
#         return None

# def create_prompt(user_data):
#     prompt = (
#         f"Create a personalized weekly workout plan for the following user:\n"
#         f"- Age: {user_data['age']}\n"
#         f"- Weight: {user_data['weight']} kg\n"
#         f"- Height: {user_data['height']} cm\n"
#         f"- Fitness Level: {user_data['fitness_level']}\n"
#         f"- Strength Goals: {user_data['strength_goals']}\n"
#         f"- Available Equipment: {user_data['equipment']}\n"
#         f"- Workout Time Availability: {user_data['workout_time']} minutes per session, {user_data['workout_days']} days per week\n\n"
#         f"Please provide a detailed workout plan including exercises, sets, reps, and any necessary instructions."
#     )
#     return prompt

def parse_ai_response(ai_response):
    output = ai_response.get('output')
    if isinstance(output, list):
        # Join the list of strings
        workout_plan_text = ''.join(output).strip()
    elif isinstance(output, str):
        workout_plan_text = output.strip()
    else:
        workout_plan_text = 'No workout plan generated.'

    return {'plan': workout_plan_text}
