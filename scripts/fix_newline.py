from pathlib import Path

path = Path("backend/buses/models.py")
content = path.read_text(encoding="utf-8")

# Arreglar la línea rota del \n
old = '''        if notas:
            self.notas = (self.notas + "
 + notas).strip()
        self.save()'''

# Versión correcta (usamos concatenación simple)
new = '''        if notas:
            self.notas = (self.notas + "\\n" + notas).strip()
        self.save()'''

# Buscar cualquier versión rota del if notas
import re
content = re.sub(
    r'if notas:\s*self\.notas = \(self\.notas \+ .*?\)\.strip\(\)\s*self\.save\(\)',
    'if notas:\n            self.notas = (self.notas + "\\\\n" + notas).strip()\n        self.save()',
    content,
    flags=re.DOTALL
)

path.write_text(content, encoding="utf-8")
print("Línea reparada")
