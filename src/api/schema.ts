import z from 'zod'

export const HEADERS_SCHEMA = z.object({
  'x-api-key': z.string({ error: 'API Key is required' }),
})
export const errorResponse = {
  content: {
    'application/json': {
      schema: z.object({ message: z.string() }),
    },
  },
}
