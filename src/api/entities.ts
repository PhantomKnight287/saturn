import { projectStatus } from '@/server/db/schema'
import z from 'zod'

export const ProjectEntity = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    dueDate: z.date().nullable(),
    status: z.enum(projectStatus.enumValues),
    createdAt: z.date(),
    updatedAt: z.date(),
    description: z.string().nullable(),
  })
  .openapi('Project')
