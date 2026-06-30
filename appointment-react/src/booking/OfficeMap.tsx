import { useEffect, useRef } from 'react'
import L from 'leaflet'

import 'leaflet/dist/leaflet.css'

import type { Office } from '@/api/schemas'

const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const attribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export default function OfficeMap({ office }: { office: Office }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (
      !container ||
      office.latitude === null ||
      office.latitude === undefined ||
      office.longitude === null ||
      office.longitude === undefined
    ) {
      return
    }

    const coordinates = L.latLng(office.latitude, office.longitude)
    const map = L.map(container, {
      scrollWheelZoom: false,
    }).setView(coordinates, 15)
    map.attributionControl.setPrefix('')
    L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 19,
    }).addTo(map)
    L.circleMarker(coordinates, {
      color: '#013366',
      fillColor: '#fcba19',
      fillOpacity: 1,
      radius: 8,
      weight: 3,
    })
      .addTo(map)
      .bindPopup(office.office_name)

    return () => {
      map.remove()
    }
  }, [office.latitude, office.longitude, office.office_name, office.office_id])

  if (
    office.latitude === null ||
    office.latitude === undefined ||
    office.longitude === null ||
    office.longitude === undefined
  ) {
    return (
      <div className="bg-bc-light-gray text-bc-secondary flex min-h-60 items-center justify-center p-4 text-center">
        A map is not available for this location.
      </div>
    )
  }

  return (
    <div
      aria-label={`Map showing ${office.office_name}`}
      className="flex-1 w-full"
      ref={containerRef}
    />
  )
}
