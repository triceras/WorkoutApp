# Generated by Django 5.1.3 on 2024-12-18 01:55

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_alter_trainingsessionexercise_exercise_and_more'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='trainingsession',
            constraint=models.UniqueConstraint(fields=('user', 'date', 'workout_plan'), name='unique_user_date_workout'),
        ),
    ]