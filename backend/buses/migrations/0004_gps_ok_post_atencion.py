from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('buses', '0003_configuracionsistema_inventarioee_inventarioflota'),
    ]

    operations = [
        migrations.AddField(
            model_name='eemovil',
            name='gps_ok_post_atencion',
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name='eemovil',
            name='patio',
            field=models.CharField(blank=True, default='CURUNDU', max_length=100),
        ),
        migrations.AlterField(
            model_name='usuario',
            name='patio_asignado',
            field=models.CharField(blank=True, default='CURUNDU', max_length=100),
        ),
    ]
