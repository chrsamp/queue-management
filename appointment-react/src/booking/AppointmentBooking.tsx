import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  MapPin,
  Phone,
} from 'lucide-react'
import type { Key } from 'react-aria-components'

import {
  deleteDraft,
  getCategories,
  getOffices,
  getServices,
} from '@/api/endpoints'
import type { Office, Service } from '@/api/schemas'
import { useApiClient } from '@/api/use-api-client'
import AppointmentSummary from '@/booking/AppointmentSummary'
import BookingLogin from '@/booking/BookingLogin'
import { RequestError, StepHeader } from '@/booking/BookingStepLayout'
import DateSelection from '@/booking/DateSelection'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import Dialog, { DialogTitle } from '@/components/Dialog'
import LoadingIndicator from '@/components/LoadingIndicator'
import Modal from '@/components/Modal'
import Select, { type SelectItem } from '@/components/Select'
import type { RuntimeConfig } from '@/config/runtime-config'
import { queryKeys } from '@/query/query-keys'
import {
  filterServices,
  getOfficeHours,
  getRelevantCategories,
  getServiceDisplayName,
  getVisibleOffices,
  getVisibleServices,
  SERVICE_DISABLED,
} from '@/booking/booking-utils'
import OfficeMap from '@/booking/OfficeMap'
import { useBookingStore, type BookingStep } from '@/store/booking-store'

type NumberedBookingStep = Exclude<BookingStep, 'intro' | 'login'>

const numberedSteps: { id: NumberedBookingStep; label: string }[] = [
  { id: 'location', label: 'Select a Service BC location' },
  { id: 'service', label: 'Select the service you need' },
  { id: 'date', label: 'Select a date and time' },
  { id: 'summary', label: 'Appointment summary' },
]

interface OfficeItem extends SelectItem {
  office: Office
}

interface ServiceItem extends SelectItem {
  service: Service
}

export default function AppointmentBooking({
  config,
}: {
  config: RuntimeConfig
}) {
  const currentStep = useBookingStore((state) => state.currentStep)
  const editAppointmentId = useBookingStore((state) => state.editAppointmentId)
  const setCurrentStep = useBookingStore((state) => state.setCurrentStep)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousStep = useRef(currentStep)

  useEffect(() => {
    if (previousStep.current !== currentStep) {
      headingRef.current?.focus()
      previousStep.current = currentStep
    }
  }, [currentStep])

  if (currentStep === 'intro') {
    return (
      <BookingIntro
        headingRef={headingRef}
        onStart={() => setCurrentStep('location')}
      />
    )
  }

  const numberedStep: NumberedBookingStep | null =
    currentStep === 'login' ? null : currentStep
  const stepIndex =
    currentStep === 'login'
      ? 2
      : numberedSteps.findIndex((step) => step.id === numberedStep)
  const backTarget: BookingStep | null =
    currentStep === 'location'
      ? 'intro'
      : currentStep === 'service'
        ? 'location'
        : currentStep === 'date'
          ? editAppointmentId === null
            ? 'service'
            : null
          : currentStep === 'login' || currentStep === 'summary'
            ? 'date'
            : null
  const navigationLabel =
    currentStep === 'login' ? 'Sign in to continue' : `Step ${stepIndex + 1} of ${numberedSteps.length}`

  return (
    <section aria-labelledby="booking-heading">
      <BookingNavigation
        label={navigationLabel}
        onBack={
          backTarget === null ? undefined : () => setCurrentStep(backTarget)
        }
      />
      <BookingProgress
        activeStep={numberedStep}
        completedThroughIndex={stepIndex}
        steps={numberedSteps}
      />
      <div className="mt-6 bg-white">
        {currentStep === 'location' && <LocationStep headingRef={headingRef} />}
        {currentStep === 'service' && <ServiceStep headingRef={headingRef} />}
        {currentStep === 'date' && <DateSelection headingRef={headingRef} />}
        {currentStep === 'login' && (
          <BookingLogin config={config} headingRef={headingRef} />
        )}
        {currentStep === 'summary' && (
          <AppointmentSummary config={config} headingRef={headingRef} />
        )}
      </div>
    </section>
  )
}

function BookingIntro({
  headingRef,
  onStart,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>
  onStart: () => void
}) {
  return (
    <section
      aria-labelledby="booking-heading"
      className="max-w-3xl bg-white p-4 sm:p-6"
    >
      <h2
        className="bc-heading mt-0 mb-6 outline-none"
        id="booking-heading"
        ref={headingRef}
        tabIndex={-1}
      >
        Before you start
      </h2>
      <section aria-labelledby="what-you-should-know">
        <h3 className="bc-heading mb-4" id="what-you-should-know">
          What you should know
        </h3>
        <ul className="list-disc space-y-3 pl-6">
          <li>You may be able to complete your service online instead of in person.</li>
          <li>
            You need an email address or the BC Services Card app to book an
            appointment. If you don&apos;t have either, you can still book an
            appointment by calling Service BC.
          </li>
          <li>
            If you need help to book an appointment, please:
            <ul className="mt-2 list-disc space-y-2 pl-6">
              <li>
                Call us toll-free: <a href="tel:+18006636687">1-800-663-6687</a>
              </li>
              <li>
                Outside of Canada/USA:{' '}
                <a href="tel:+16046602421">1-604-660-2421</a>
              </li>
              <li>
                Text us: <a href="sms:+16046602421">1-604-660-2421</a>
              </li>
              <li>
                <a className="underline text-bc-link" href="https://gov.bc.ca/contact">
                  Get help with government services
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </section>
      <Button className="mt-6" onClick={onStart} size="large">
        Book an appointment
      </Button>
    </section>
  )
}

function BookingNavigation({
  label,
  onBack,
}: {
  label: string
  onBack?: () => void
}) {
  return (
    <div className="mb-4 flex min-h-10 items-center gap-3">
      {onBack && (
        <Button aria-label="Back" onClick={onBack} variant="secondary">
          <ArrowLeft aria-hidden="true" className="size-5" />
          Back
        </Button>
      )}
      <span className="font-bold">{label}</span>
    </div>
  )
}

function BookingProgress({
  activeStep,
  completedThroughIndex,
  steps,
}: {
  activeStep: NumberedBookingStep | null
  completedThroughIndex: number
  steps: { id: NumberedBookingStep; label: string }[]
}) {
  return (
    <nav aria-label="Booking progress" className="my-8">
      <ol className="grid w-full grid-cols-1 gap-2 sm:auto-cols-fr sm:grid-flow-col sm:gap-0">
        {steps.map((step, index) => (
          <li
            aria-current={step.id === activeStep ? 'step' : undefined}
            className="relative flex items-center gap-2 sm:flex-col sm:text-center"
            key={step.id}
          >
            <span
              aria-hidden="true"
              className={`z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 ${
                index <= completedThroughIndex
                  ? 'border-bc-button-primary bg-bc-button-primary text-white'
                  : 'border-bc-border bg-white'
              }`}
            >
              {index + 1}
            </span>
            <span
              className={
                step.id === activeStep
                  ? 'text-bc-small font-bold'
                  : 'text-bc-small text-bc-secondary'
              }
            >
              {step.label}
            </span>
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="bg-bc-border absolute top-4 left-1/2 hidden h-px w-full sm:block"
              />
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function LocationStep({
  headingRef,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>
}) {
  const apiClient = useApiClient()
  const selectedOfficeId = useBookingStore((state) => state.selectedOfficeId)
  const setOfficeId = useBookingStore((state) => state.setOfficeId)
  const draftAppointmentId = useBookingStore(
    (state) => state.draftAppointmentId,
  )
  const setCurrentStep = useBookingStore((state) => state.setCurrentStep)
  const [servicesOpen, setServicesOpen] = useState(false)
  const officesQuery = useQuery({
    queryFn: ({ signal }) => getOffices(apiClient, signal),
    queryKey: queryKeys.offices,
  })
  const offices = useMemo(
    () => getVisibleOffices(officesQuery.data?.offices ?? []),
    [officesQuery.data],
  )
  const officeItems = useMemo<OfficeItem[]>(
    () =>
      offices.map((office) => ({
        id: office.office_id,
        label: office.office_name,
        office,
      })),
    [offices],
  )
  const selectedOffice =
    offices.find((office) => office.office_id === selectedOfficeId) ?? null

  useEffect(() => {
    if (
      officesQuery.isSuccess &&
      selectedOfficeId !== null &&
      !selectedOffice
    ) {
      setOfficeId(null)
    }
  }, [officesQuery.isSuccess, selectedOffice, selectedOfficeId, setOfficeId])

  function handleOfficeChange(key: Key | null) {
    const officeId = key === null ? null : Number(key)
    if (officeId !== selectedOfficeId && draftAppointmentId !== null) {
      void deleteDraft(apiClient, draftAppointmentId).catch(() => undefined)
    }
    setOfficeId(officeId)
  }

  return (
    <>
      <StepHeader
        headingRef={headingRef}
        subtitle="Appointments are available at most Service BC locations"
        title="Select a Service BC location"
      />
      <div className="p-4 sm:p-6">
        {officesQuery.isPending && <LoadingIndicator label="Loading offices" />}
        {officesQuery.isError && (
          <RequestError
            message="Unable to load offices. Please try again."
            onRetry={() => void officesQuery.refetch()}
          />
        )}
        {officesQuery.isSuccess && offices.length === 0 && (
          <AlertBanner isCloseable={false} variant="warning">
            No offices are currently available for online appointments.
          </AlertBanner>
        )}
        {offices.length > 0 && (
          <Select
            aria-label="Select Office"
            className="max-w-lg"
            items={officeItems}
            onSelectionChange={handleOfficeChange}
            placeholder="Select Office"
            renderEmptyState={() => (
              <div className="text-bc-secondary p-3">
                No offices match your search.
              </div>
            )}
            searchable
            searchLabel="Search offices"
            searchPlaceholder="Search by office name"
            selectedKey={selectedOfficeId}
          />
        )}
        {selectedOffice && (
          <OfficeDetails
            office={selectedOffice}
            onBook={() => setCurrentStep('service')}
            onShowServices={() => setServicesOpen(true)}
          />
        )}
      </div>
      {selectedOffice && servicesOpen && (
        <AvailableServicesDialog
          isOpen={servicesOpen}
          office={selectedOffice}
          onClose={() => setServicesOpen(false)}
        />
      )}
    </>
  )
}

function OfficeDetails({
  office,
  onBook,
  onShowServices,
}: {
  office: Office
  onBook: () => void
  onShowServices: () => void
}) {
  const hours = getOfficeHours(office)
  return (
    <article className="border-bc-border mt-6 overflow-hidden border">
      <div className="grid md:grid-cols-2">
        <div className="flex flex-col gap-5 p-5">
          <h3 className="text-bc-h4 m-0">{office.office_name}</h3>
          {office.office_appointment_message && (
            <AlertBanner isCloseable={false} size="small">
              {office.office_appointment_message}
            </AlertBanner>
          )}
          {office.civic_address && (
            <span className="inline-flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4" />
              {office.civic_address}
            </span>
          )}
          {office.telephone && (
            <a
              className="inline-flex w-fit items-center gap-2"
              href={`tel:${office.telephone}`}
            >
              <Phone aria-hidden="true" className="size-4" />
              {office.telephone}
            </a>
          )}
          <dl className="m-0 grid grid-cols-[minmax(7rem,1fr)_2fr] gap-x-3 gap-y-1">
            {hours.map(({ day, end, start }) => (
              <div className="contents" key={day}>
                <dt>{day}</dt>
                <dd className="m-0 font-medium">
                  {start && end ? `${start} – ${end}` : 'Closed'}
                </dd>
              </div>
            ))}
          </dl>
          <a
            aria-haspopup="dialog"
            className="focus-visible:outline-bc-focus w-fit underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
            href="#available-services-dialog"
            onClick={(event) => {
              event.preventDefault()
              onShowServices()
            }}
          >
            View available services
          </a>
          <Button className="mt-auto w-full" onClick={onBook} size="large">
            Book Appointment
          </Button>
        </div>
        <div className="border-bc-border flex flex-col border-t md:border-t-0 md:border-l">
          <OfficeMap office={office} />
        </div>
      </div>
    </article>
  )
}

function AvailableServicesDialog({
  isOpen,
  office,
  onClose,
}: {
  isOpen: boolean
  office: Office
  onClose: () => void
}) {
  const apiClient = useApiClient()
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const servicesQuery = useQuery({
    queryFn: ({ signal }) => getServices(apiClient, office.office_id, signal),
    queryKey: queryKeys.services.office(office.office_id),
  })
  const categoriesQuery = useQuery({
    queryFn: ({ signal }) => getCategories(apiClient, signal),
    queryKey: queryKeys.categories,
  })
  const services = useMemo(
    () => getVisibleServices(servicesQuery.data?.services ?? []),
    [servicesQuery.data],
  )
  const categories = useMemo(
    () =>
      getRelevantCategories(categoriesQuery.data?.categories ?? [], services),
    [categoriesQuery.data, services],
  )
  const filteredServices = useMemo(
    () => filterServices({ categoryId, search, services }),
    [categoryId, search, services],
  )

  function close() {
    setCategoryId(null)
    setSearch('')
    onClose()
  }

  return (
    <Modal
      isDismissable
      isOpen={isOpen}
      onOpenChange={(open) => !open && close()}
    >
      <Dialog
        className="max-h-[calc(100vh-2rem)] overflow-auto"
        id="available-services-dialog"
      >
        <DialogTitle className="text-bc-h4 mt-0 pr-8">
          Location Services for {office.office_name}
        </DialogTitle>
        {(servicesQuery.isPending || categoriesQuery.isPending) && (
          <LoadingIndicator label="Loading available services" />
        )}
        {(servicesQuery.isError || categoriesQuery.isError) && (
          <RequestError
            message="Unable to load available services. Please try again."
            onRetry={() => {
              void servicesQuery.refetch()
              void categoriesQuery.refetch()
            }}
          />
        )}
        {servicesQuery.isSuccess && categoriesQuery.isSuccess && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-bc-small text-bc-secondary">
                  Categories
                </span>
                <select
                  className="border-bc-border focus:outline-bc-focus min-h-10 rounded-sm border bg-white px-3 focus:outline-2"
                  onChange={(event) => {
                    setCategoryId(Number(event.target.value) || null)
                    setSearch('')
                  }}
                  value={categoryId ?? ''}
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option
                      key={category.service_id}
                      value={category.service_id}
                    >
                      {getServiceDisplayName(category)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-bc-small text-bc-secondary">
                  Search Service
                </span>
                <input
                  className="border-bc-border focus:outline-bc-focus min-h-10 rounded-sm border px-3 focus:outline-2"
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setCategoryId(null)
                  }}
                  type="search"
                  value={search}
                />
              </label>
            </div>
            <div className="border-bc-border mt-4 max-h-80 overflow-auto border">
              <table className="w-full border-collapse text-left">
                <thead className="bg-bc-light-gray sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Service</th>
                    <th className="px-3 py-2 text-right">
                      <span className="sr-only">Online option</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((service) => (
                    <tr
                      className="border-bc-border border-t"
                      key={service.service_id}
                    >
                      <td
                        className={`px-3 py-2 ${
                          service.online_availability === SERVICE_DISABLED
                            ? 'text-bc-disabled-text'
                            : ''
                        }`}
                      >
                        {getServiceDisplayName(service)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {service.online_link && (
                          <a
                            className="inline-flex items-center gap-1"
                            href={service.online_link}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Online Option
                            <ExternalLink
                              aria-hidden="true"
                              className="size-4"
                            />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredServices.length === 0 && (
                    <tr>
                      <td
                        className="text-bc-secondary px-3 py-6 text-center"
                        colSpan={2}
                      >
                        No services match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Dialog>
    </Modal>
  )
}

function ServiceStep({
  headingRef,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>
}) {
  const apiClient = useApiClient()
  const selectedOfficeId = useBookingStore((state) => state.selectedOfficeId)
  const selectedServiceId = useBookingStore((state) => state.selectedServiceId)
  const setServiceId = useBookingStore((state) => state.setServiceId)
  const draftAppointmentId = useBookingStore(
    (state) => state.draftAppointmentId,
  )
  const setCurrentStep = useBookingStore((state) => state.setCurrentStep)
  const servicesQuery = useQuery({
    enabled: selectedOfficeId !== null,
    queryFn: ({ signal }) => getServices(apiClient, selectedOfficeId!, signal),
    queryKey: queryKeys.services.office(selectedOfficeId ?? 0),
  })
  const services = useMemo(
    () => getVisibleServices(servicesQuery.data?.services ?? []),
    [servicesQuery.data],
  )
  const serviceItems = useMemo<ServiceItem[]>(
    () =>
      services.map((service) => {
        const unavailable = service.online_availability === SERVICE_DISABLED
        return {
          description: service.service_desc ?? undefined,
          id: service.service_id,
          isUnavailable: unavailable,
          label: `${getServiceDisplayName(service)}${
            unavailable ? ' (Unavailable)' : ''
          }`,
          service,
          textValue: `${getServiceDisplayName(service)} ${
            service.service_desc ?? ''
          }`,
        }
      }),
    [services],
  )
  const selectedService =
    services.find((service) => service.service_id === selectedServiceId) ?? null
  const unavailable = selectedService?.online_availability === SERVICE_DISABLED

  useEffect(() => {
    if (
      servicesQuery.isSuccess &&
      selectedServiceId !== null &&
      !selectedService
    ) {
      setServiceId(null)
    }
  }, [
    selectedService,
    selectedServiceId,
    servicesQuery.isSuccess,
    setServiceId,
  ])

  useEffect(() => {
    if (selectedOfficeId === null) setCurrentStep('location')
  }, [selectedOfficeId, setCurrentStep])

  if (selectedOfficeId === null) {
    return null
  }

  return (
    <>
      <StepHeader
        headingRef={headingRef}
        subtitle="You can book an appointment for most services. Not all services are available at every Service BC location."
        title="Select the service you need"
      />
      <div className="p-4 sm:p-6">
        {servicesQuery.isPending && (
          <LoadingIndicator label="Loading services" />
        )}
        {servicesQuery.isError && (
          <RequestError
            message="Unable to load services. Please try again."
            onRetry={() => void servicesQuery.refetch()}
          />
        )}
        {servicesQuery.isSuccess && services.length === 0 && (
          <AlertBanner isCloseable={false} variant="warning">
            No appointment services are currently available at this office.
          </AlertBanner>
        )}
        {services.length > 0 && (
          <Select
            aria-label="Select Service"
            className="max-w-lg"
            items={serviceItems}
            onSelectionChange={(key) => {
              const serviceId = key === null ? null : Number(key)
              if (
                serviceId !== selectedServiceId &&
                draftAppointmentId !== null
              ) {
                void deleteDraft(apiClient, draftAppointmentId).catch(
                  () => undefined,
                )
              }
              setServiceId(serviceId)
            }}
            placeholder="Select Service"
            renderEmptyState={() => (
              <div className="text-bc-secondary p-3">
                No services match your search.
              </div>
            )}
            searchable
            searchLabel="Search services"
            searchPlaceholder="Search by service name or description"
            selectedKey={selectedServiceId}
          />
        )}
        {selectedService && (
          <div className="mt-6 max-w-3xl text-left">
            {unavailable ? (
              <p>
                We&apos;re sorry,{' '}
                <strong>{getServiceDisplayName(selectedService)}</strong> is not
                available by appointment.
              </p>
            ) : (
              <>
                <Button onClick={() => setCurrentStep('date')} size="large">
                  Next
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
                {selectedService.online_link && (
                  <p>
                    <strong>{getServiceDisplayName(selectedService)}</strong>{' '}
                    can be completed online.
                  </p>
                )}
              </>
            )}
            {selectedService.online_link && (
              <p>
                <a
                  href={selectedService.online_link}
                  rel="noreferrer"
                  target="_blank"
                >
                  Would you like to try online?
                </a>
              </p>
            )}
            {!unavailable && (
              <p className="text-bc-small mt-8">
                Information is collected under the authority of{' '}
                <a
                  href="https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96165_03#section26"
                  rel="noreferrer"
                  target="_blank"
                >
                  Section 26(c)
                </a>{' '}
                of the Freedom of Information and Protection of Privacy Act to
                help us assess and respond to your enquiry. Questions about the
                collection of information can be directed to the Director,
                Provincial Operations, PO BOX 9412 STN PROV GOVT, Victoria, BC,
                V8W 9V1, 1 800 663-7867.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
