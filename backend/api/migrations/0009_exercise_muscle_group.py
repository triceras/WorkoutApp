# Generated by Django 5.1.3 on 2024-12-15 09:10

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_exercise_instructions'),
    ]

    operations = [
        migrations.AddField(
            model_name='exercise',
            name='muscle_group',
            field=models.CharField(blank=True, choices=[('chest', 'Chest'), ('back', 'Back'), ('shoulders', 'Shoulders'), ('arms', 'Arms'), ('legs', 'Legs'), ('core', 'Core'), ('full_body', 'Full Body'), ('cardio', 'Cardio')], max_length=50, null=True),
        ),
    ]