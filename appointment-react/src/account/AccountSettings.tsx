import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'

import { createUser, updateUser } from '@/api/endpoints'
import { useApiClient } from '@/api/use-api-client'
import { RequestError } from '@/booking/BookingStepLayout'
import AlertBanner from '@/components/AlertBanner'
import Button from '@/components/Button'
import LoadingIndicator from '@/components/LoadingIndicator'
import Switch from '@/components/Switch'
import TextField from '@/components/TextField'
import type { RuntimeConfig } from '@/config/runtime-config'
import { queryKeys } from '@/query/query-keys'

const accountSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Email must be valid'),
  sendEmailReminders: z.boolean(),
  sendSmsReminders: z.boolean(),
  telephone: z.string().max(20, 'Phone must be 20 characters or fewer'),
})

type AccountValues = z.infer<typeof accountSchema>

export default function AccountSettings({ config }: { config: RuntimeConfig }) {
  const apiClient = useApiClient()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [result, setResult] = useState<'success' | 'error' | null>(null)
  const userQuery = useQuery({
    queryFn: ({ signal }) => createUser(apiClient, signal),
    queryKey: queryKeys.users.me,
    staleTime: Number.POSITIVE_INFINITY,
  })
  const user = userQuery.data?.[0] ?? null
  const {
    control,
    formState: { isDirty, isValid },
    handleSubmit,
    reset,
  } = useForm<AccountValues>({
    defaultValues: {
      email: '',
      sendEmailReminders: false,
      sendSmsReminders: false,
      telephone: '',
    },
    mode: 'onChange',
    resolver: zodResolver(accountSchema),
  })

  useEffect(() => {
    if (!user) return
    reset({
      email: user.email ?? '',
      sendEmailReminders: Boolean(user.send_email_reminders),
      sendSmsReminders: Boolean(user.send_sms_reminders),
      telephone: user.telephone ?? '',
    })
  }, [reset, user])

  const updateMutation = useMutation({
    mutationFn: (values: AccountValues) => {
      if (!user) throw new Error('User profile is unavailable')
      return updateUser(apiClient, user.user_id, {
        email: values.email,
        send_email_reminders: values.sendEmailReminders,
        send_sms_reminders: values.sendSmsReminders,
        telephone: values.telephone,
      })
    },
    onError: () => setResult('error'),
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.users.me, response)
      const updated = response[0]
      if (updated) {
        reset({
          email: updated.email ?? '',
          sendEmailReminders: Boolean(updated.send_email_reminders),
          sendSmsReminders: Boolean(updated.send_sms_reminders),
          telephone: updated.telephone ?? '',
        })
      }
      setResult('success')
    },
  })

  return (
    <section
      className="mx-auto w-full max-w-3xl"
      aria-labelledby="account-heading"
    >
      <Button
        className="mb-3"
        onClick={() => void navigate('/booked-appointments')}
        variant="link"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        My Appointments
      </Button>
      <div className="border-bc-border border bg-white p-5 sm:p-7">
        <h2
          className="text-bc-h3 border-bc-border mt-0 border-b pb-4"
          id="account-heading"
        >
          Account Settings
        </h2>
        {userQuery.isPending && (
          <LoadingIndicator label="Loading account settings" />
        )}
        {userQuery.isError && (
          <RequestError
            message="Unable to load your account settings."
            onRetry={() => void userQuery.refetch()}
          />
        )}
        {user && (
          <form
            className="mt-5 flex flex-col gap-5"
            noValidate
            onSubmit={(event) =>
              void handleSubmit((values) => updateMutation.mutate(values))(
                event,
              )
            }
          >
            <div>
              <div className="text-bc-small text-bc-secondary">Name</div>
              <div className="text-bc-h4 font-bold">
                {user.display_name || user.username}
              </div>
            </div>
            <Controller
              control={control}
              name="email"
              render={({ field, fieldState }) => (
                <TextField
                  errorMessage={fieldState.error?.message}
                  isInvalid={fieldState.invalid}
                  isRequired
                  label="Email"
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  type="email"
                  value={field.value}
                />
              )}
            />
            <Controller
              control={control}
              name="telephone"
              render={({ field, fieldState }) => (
                <TextField
                  errorMessage={fieldState.error?.message}
                  isInvalid={fieldState.invalid}
                  label="Phone"
                  maxLength={20}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  type="tel"
                  value={field.value}
                />
              )}
            />
            <Controller
              control={control}
              name="sendEmailReminders"
              render={({ field }) => (
                <Switch checked={field.value} onChange={field.onChange}>
                  Send me appointment reminders via email
                </Switch>
              )}
            />
            {!config.VITE_APPOINTMENT_DISABLE_SMS && (
              <Controller
                control={control}
                name="sendSmsReminders"
                render={({ field }) => (
                  <Switch checked={field.value} onChange={field.onChange}>
                    Send me appointment reminders via SMS text message
                  </Switch>
                )}
              />
            )}
            {result === 'success' && (
              <AlertBanner isCloseable={false} variant="success">
                Profile Successfully Updated!
              </AlertBanner>
            )}
            {result === 'error' && (
              <AlertBanner isCloseable={false} role="alert" variant="danger">
                Error! Unable to Update Profile
              </AlertBanner>
            )}
            <Button
              className="self-start"
              disabled={!isDirty || !isValid || updateMutation.isPending}
              size="large"
              type="submit"
            >
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </form>
        )}
      </div>
    </section>
  )
}
