#!/usr/bin/env bash
# Fake a phone for one seeker: point it at an influencer, then post a reading each second, so Find in Hero Goggles
# updates in a desktop browser at https://hero-goggles.darkshift.cloud/?seeker=<seeker>.
#   scripts/fake-reading.sh john            # Kelsey, 4.2 m, 30 degrees right, for 20 s
#   scripts/fake-reading.sh john 7 -45 kunal 60
# Readings and the target need no key. API=http://127.0.0.1:8080 for a local influence-api.
set -euo pipefail
seeker=${1:?usage: fake-reading.sh <seeker> [distance] [azimuth] [influencer] [seconds]}
dist=${2:-4.2} az=${3:-30} who=${4:-kelsey} secs=${5:-20}
API=${API:-https://influence-api.darkshift.cloud}
curl -sS -X PUT "$API/api/target?seeker=$seeker" -H 'content-type: application/json' -d "{\"name\":\"$who\"}" |
  jq -c '{seekerId, name, hardwareId}'
hw=$(curl -sS "$API/api/target?seeker=$seeker" | jq -r '.hardwareId // .beaconId')
for i in $(seq 1 "$secs"); do
  d=$(awk -v d="$dist" -v i="$i" 'BEGIN { printf "%.1f", d + 0.4 * sin(i / 2) }')
  curl -sS -X POST "$API/api/readings" -H 'content-type: application/json' \
    -d "{\"seeker\":\"$seeker\",\"hardwareId\":\"$hw\",\"distance\":$d,\"azimuthDeg\":$az}" | jq -c '.[0] | {seekerId, hardwareId, distance, at}'
  sleep 1
done
echo "stopped: Find shows 'No signal' within 5 s"
