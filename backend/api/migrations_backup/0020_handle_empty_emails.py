

from django.db import migrations

def handle_empty_emails(apps, schema_editor):
    User = apps.get_model('api', 'User')
    users_with_empty_email = User.objects.filter(email='')
    for index, user in enumerate(users_with_empty_email):
        user.email = f'user{index}@example.com'
        user.save()

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0011_alter_user_username'),  # Replace with the actual previous migration
    ]

    operations = [
        migrations.RunPython(handle_empty_emails),
    ]
