import re

filepath = 'apps/driver-pwa/src/features/navigation/components/DriverNavigation.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "    const broadcastCoords = (lat: number, lng: number) => {"
end_marker = "    };\n  }, [bookingId]);"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Markers not found")
    exit(1)

new_block = """    if (channel) {
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          const cur = profileRef.current;
          if (cur.currentLat && cur.currentLng) {
            channel.send({
              type: 'broadcast',
              event: 'driver_location',
              payload: { lat: cur.currentLat, lng: cur.currentLng },
            });
          }
        }
      });
    }

    // Broadcast Driver Location whenever it changes from the central context
    const broadcastInterval = setInterval(() => {
       const cur = profileRef.current;
       if (channel && cur.currentLat && cur.currentLng) {
         channel.send({
           type: 'broadcast',
           event: 'driver_location',
           payload: { lat: cur.currentLat, lng: cur.currentLng },
         });
       }
    }, 2000);

    return () => {
      clearInterval(broadcastInterval);
      if (channel) {
        supabase.removeChannel(channel);
      }
"""

content = content[:start_idx] + new_block + content[end_idx:]

content = content.replace(", getCurrentDevicePosition, watchDevicePosition", "")
content = content.replace("getCurrentDevicePosition, watchDevicePosition, ", "")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated DriverNavigation")
