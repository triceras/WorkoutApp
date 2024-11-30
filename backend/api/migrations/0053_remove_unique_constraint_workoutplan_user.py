# backend/api/migrations/0053_remove_unique_constraint_workoutplan_user.py

from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0052_alter_trainingsessionexercise_weight'),  # Replace with your actual previous migration
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE api_workoutplan
                DROP CONSTRAINT IF EXISTS api_workoutplan_user_id_a177e140_uniq;
            """,
            reverse_sql="""
                ALTER TABLE api_workoutplan
                ADD CONSTRAINT api_workoutplan_user_id_a177e140_uniq UNIQUE (user_id);
            """,
        ),
    ]
