import re

filepath = 'apps/driver-pwa/src/features/availability/components/DriverAvailabilityHome.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace profile.id || localStorage.getItem('sakay_driver_id')
content = re.sub(r"const activeDriverId = profile\.id \|\| localStorage\.getItem\('sakay_driver_id'\);", 
                 "const activeDriverId = profile.id || localStorage.getItem('sakay_driver_id') || '11111111-1111-1111-1111-111111111111';", 
                 content)

# Replace just localStorage.getItem('sakay_driver_id')
content = re.sub(r"const activeDriverId = localStorage\.getItem\('sakay_driver_id'\);", 
                 "const activeDriverId = profile.id || localStorage.getItem('sakay_driver_id') || '11111111-1111-1111-1111-111111111111';", 
                 content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated DriverAvailabilityHome")
