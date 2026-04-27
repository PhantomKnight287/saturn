import { defineCollection, defineConfig } from '@content-collections/core'
import { compileMarkdown } from '@content-collections/markdown'
import { z } from 'zod'

const changelog = defineCollection({
  name: 'changelog',
  directory: 'content/changelog',
  include: '**/*.md',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    version: z.string().optional(),
    content: z.string(),
  }),
  transform: async (doc, ctx) => {
    const html = await compileMarkdown(ctx, doc)
    return {
      ...doc,
      slug: doc._meta.path,
      html,
    }
  },
})

export default defineConfig({
  content: [changelog],
})
