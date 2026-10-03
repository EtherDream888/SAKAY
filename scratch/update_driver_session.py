import re

filepath = 'apps/driver-pwa/src/contexts/DriverSessionContext.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace just localStorage.getItem('sakay_driver_id') inside applyLiveCoords
# or replace globally if it's the only one. Let's do it precisely inside applyLiveCoords.

start_marker = "const applyLiveCoords = (latitude: number, longitude: number) => {"
end_marker = "  // Initial fix using robust fallback"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    sub_content = content[start_idx:end_idx]
    sub_content = re.sub(r"const activeDriverId = localStorage\.getItem\('sakay_driver_id'\);",
                         "const activeDriverId = localStorage.getItem('sakay_driver_id') || '11111111-1111-1111-1111-111111111111';",
                         sub_content)
    # The prompt actually says: Append the same '11111111-1111-1111-1111-111111111111' fallback to its activeDriverId definition.
    # Let's replace the whole file content to be sure.
    content = content[:start_idx] + sub_content + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated DriverSessionContext")
