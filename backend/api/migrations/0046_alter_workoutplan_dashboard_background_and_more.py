# Generated by Django 5.1.2 on 2024-10-23 08:29

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0045_alter_workoutplan_id"),
    ]

    operations = [
        migrations.AlterField(
            model_name="workoutplan",
            name="dashboard_background",
            field=models.CharField(blank=True, max_length=250, null=True),
        ),
        migrations.AlterField(
            model_name="workoutplan",
            name="workoutplan_background",
            field=models.CharField(blank=True, max_length=250, null=True),
        ),
    ]