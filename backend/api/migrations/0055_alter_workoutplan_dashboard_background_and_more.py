# Generated by Django 5.1.3 on 2024-11-30 01:51

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0054_alter_workoutplan_user'),
    ]

    operations = [
        migrations.AlterField(
            model_name='workoutplan',
            name='dashboard_background',
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
        migrations.AlterField(
            model_name='workoutplan',
            name='workoutplan_background',
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
    ]