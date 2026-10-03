import re

filepath = 'apps/driver-pwa/src/features/trip-management/components/DriverActiveTrip.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove dbInterval block
db_pattern = re.compile(r'\s*const dbInterval = setInterval\(\(\) => \{.*?\n\s*\}, 5000\);', re.DOTALL)
content = db_pattern.sub('', content)

# Remove clearInterval(dbInterval)
clear_pattern = re.compile(r'\s*clearInterval\(dbInterval\);')
content = clear_pattern.sub('', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated DriverActiveTrip")
