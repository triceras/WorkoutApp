# Generated by Django 5.1.3 on 2024-12-03 06:56

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0059_trainingsessionexercise_average_heart_rate_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='workoutplan',
            name='dashboard_background',
        ),
        migrations.RemoveField(
            model_name='workoutplan',
            name='workoutplan_background',
        ),
    ]