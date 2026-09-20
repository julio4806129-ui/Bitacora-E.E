import os
import csv
from django.conf import settings
from .models import RegistroBitacora, EEMovil, DatosBusae

class ExportService:
    def __init__(self):
        self.tmp_dir = os.path.join(settings.MEDIA_ROOT, 'tmp')
        os.makedirs(self.tmp_dir, exist_ok=True)

    def generate_csv(self, queryset, columns, filename):
        file_path = os.path.join(self.tmp_dir, f"{filename}.csv")
        with open(file_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([col[1] for col in columns])
            for obj in queryset:
                row = []
                for col in columns:
                    val = getattr(obj, col[0], '')
                    if callable(val):
                        val = val()
                    row.append(str(val))
                writer.writerow(row)
        return file_path

    def generate_excel(self, queryset, columns, filename):
        import openpyxl
        file_path = os.path.join(self.tmp_dir, f"{filename}.xlsx")
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append([col[1] for col in columns])
        for obj in queryset:
            row = []
            for col in columns:
                val = getattr(obj, col[0], '')
                if callable(val):
                    val = val()
                row.append(str(val))
            ws.append(row)
        wb.save(file_path)
        return file_path

    def generate_pdf(self, queryset, columns, filename, title):
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter, landscape
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
        from reportlab.lib.styles import getSampleStyleSheet
        
        file_path = os.path.join(self.tmp_dir, f"{filename}.pdf")
        doc = SimpleDocTemplate(file_path, pagesize=landscape(letter))
        elements = []
        
        styles = getSampleStyleSheet()
        elements.append(Paragraph(title, styles['Title']))
        
        data = [[col[1] for col in columns]]
        for obj in queryset:
            row = []
            for col in columns:
                val = getattr(obj, col[0], '')
                if callable(val):
                    val = val()
                row.append(str(val))
            data.append(row)
            
        t = Table(data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(t)
        doc.build(elements)
        return file_path

    def get_report_data(self, tipo_reporte, parametros):
        tipo = (tipo_reporte or '').lower().replace('-', '_')
        
        if tipo in ['bitacora', 'registros_bitacora', 'historial']:
            qs = RegistroBitacora.objects.all()
            if parametros.get('bus_movil'):
                qs = qs.filter(bus_movil=parametros['bus_movil'])
            if parametros.get('patio'):
                qs = qs.filter(patio__icontains=parametros['patio'])
            if parametros.get('fecha_inicio'):
                qs = qs.filter(timestamp__gte=parametros['fecha_inicio'])
            if parametros.get('fecha_fin'):
                qs = qs.filter(timestamp__lte=parametros['fecha_fin'])
            cols = [
                ('id', 'ID'),
                ('timestamp', 'Fecha'),
                ('bus_movil', 'Bus Móvil'),
                ('patio', 'Patio'),
                ('tipo_mantenimiento', 'Tipo de Mantenimiento'),
                ('observaciones', 'Observaciones'),
            ]
            return qs, cols

        elif tipo in ['ee_moviles', 'eemoviles', 'equipamiento']:
            qs = EEMovil.objects.all()
            if parametros.get('bus_movil'):
                qs = qs.filter(bus_movil=parametros['bus_movil'])
            cols = [
                ('bus_movil', 'Bus Móvil'),
                ('fase_instalacion', 'Fase Instalación'),
                ('fase_bocina', 'Fase Bocina'),
                ('version_firmware', 'Versión Firmware'),
                ('estado_fw', 'Estado FW'),
                ('actualizado_en', 'Última Actualización'),
            ]
            return qs, cols

        elif tipo in ['incidencias', 'reporte_incidencias']:
            qs = RegistroBitacora.objects.filter(tipo_mantenimiento__icontains='incidencia')
            if not qs.exists():
                qs = RegistroBitacora.objects.all()
            cols = [
                ('id', 'ID'),
                ('timestamp', 'Fecha/Hora'),
                ('bus_movil', 'Móvil'),
                ('patio', 'Patio'),
                ('tipo_mantenimiento', 'Incidencia / Mant.'),
                ('observaciones', 'Detalle'),
            ]
            return qs, cols

        elif tipo in ['rendimiento_tecnicos', 'rendimiento']:
            from .models import Usuario
            qs = Usuario.objects.filter(es_admin=False)
            cols = [
                ('codigo_empleado', 'Código Empleado'),
                ('username', 'Usuario'),
                ('first_name', 'Nombre'),
                ('last_name', 'Apellido'),
                ('patio_asignado', 'Patio Asignado'),
                ('cuota_diaria', 'Cuota Diaria'),
            ]
            return qs, cols

        elif tipo in ['buses_sin_transmision', 'sin_transmision', 'datos_busae', 'busae']:
            qs = DatosBusae.objects.all()
            cols = [
                ('bus_movil', 'Bus Móvil'),
                ('estado', 'Estado GPS'),
                ('latitud', 'Latitud'),
                ('longitud', 'Longitud'),
                ('velocidad', 'Velocidad (km/h)'),
                ('telefono', 'Teléfono'),
                ('ultima_transmision', 'Última Transmisión'),
            ]
            return qs, cols

        # Fallback default
        qs = RegistroBitacora.objects.all()[:100]
        cols = [
            ('id', 'ID'),
            ('timestamp', 'Fecha'),
            ('bus_movil', 'Bus'),
            ('tipo_mantenimiento', 'Tipo'),
        ]
        return qs, cols

