import { z } from 'zod'

export const createNewOrganizationSchema = z.object({
  name: z.string({}).min(1, { message: 'Please enter a name' }),
})

export type CreateNewOrganizationSchema = z.infer<
  typeof createNewOrganizationSchema
>
