from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_alter_exercise_muscle_group'),
    ]

    operations = [
        migrations.AlterField(
            model_name='exercise',
            name='muscle_group',
            field=models.CharField(choices=[
                ('chest', 'Chest'),
                ('back', 'Back'),
                ('shoulders', 'Shoulders'),
                ('arms', 'Arms'),
                ('legs', 'Legs'),
                ('core', 'Core'),
                ('abs', 'Abs'),
                ('full_body', 'Full Body'),
                ('cardio', 'Cardio'),
            ], default='full_body', max_length=50),
        ),
    ]
