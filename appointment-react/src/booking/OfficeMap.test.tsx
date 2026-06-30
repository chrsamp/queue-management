import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

import { officeFixture } from '@/test/fixtures'

const leaflet = vi.hoisted(() => {
  const mapInstance = {
    remove: vi.fn(),
    setView: vi.fn(),
  }
  mapInstance.setView.mockReturnValue(mapInstance)
  const marker = {
    addTo: vi.fn(),
    bindPopup: vi.fn(),
  }
  marker.addTo.mockReturnValue(marker)
  marker.bindPopup.mockReturnValue(marker)
  const tileLayer = { addTo: vi.fn() }
  return {
    circleMarker: vi.fn(() => marker),
    latLng: vi.fn((latitude: number, longitude: number) => ({
      lat: latitude,
      lng: longitude,
    })),
    map: vi.fn(() => mapInstance),
    mapInstance,
    marker,
    tileLayer: vi.fn(() => tileLayer),
    tileLayerInstance: tileLayer,
  }
})

vi.mock('leaflet', () => ({ default: leaflet }))

import OfficeMap from './OfficeMap'

beforeEach(() => {
  vi.clearAllMocks()
})

it('creates an attributed OpenStreetMap layer and cleans it up', () => {
  const { unmount } = render(<OfficeMap office={officeFixture} />)

  expect(
    screen.getByLabelText(`Map showing ${officeFixture.office_name}`),
  ).toBeVisible()
  expect(leaflet.map).toHaveBeenCalled()
  expect(leaflet.tileLayer).toHaveBeenCalledWith(
    'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    expect.objectContaining({
      attribution: expect.stringContaining('OpenStreetMap'),
    }),
  )
  expect(leaflet.circleMarker).toHaveBeenCalled()

  unmount()
  expect(leaflet.mapInstance.remove).toHaveBeenCalled()
})

it('shows a fallback when an office has no coordinates', () => {
  render(
    <OfficeMap
      office={{ ...officeFixture, latitude: null, longitude: null }}
    />,
  )

  expect(
    screen.getByText('A map is not available for this location.'),
  ).toBeVisible()
  expect(leaflet.map).not.toHaveBeenCalled()
})
