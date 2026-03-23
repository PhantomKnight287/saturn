import { z } from 'zod'

export const createNewOrganizationSchema = z.object({
  name: z.string({}).min(1, { message: 'Please enter a name' }),
  currency: z.string({}).min(1, { message: 'Please select a currency' }),
})

export type CreateNewOrganizationSchema = z.infer<
  typeof createNewOrganizationSchema
>
