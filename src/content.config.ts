import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { blogSchema } from 'starlight-blog/schema';

// Writeup（CTF 题解）frontmatter：与 writeups/_template.md 对齐，全部 optional 以兼容存量 index.md
const writeupFields = z.object({
	author: z.string().optional(),
	category: z
		.enum(['Pwn', 'Reverse', 'Web', 'Crypto', 'Misc', 'Mobile', 'Blockchain', 'AI', 'Forensics', 'OSINT', 'Hardware'])
		.optional(),
	subcategory: z.string().optional(),
	difficulty: z.enum(['Easy', 'Medium', 'Hard', 'Insane']).optional(),
	my_difficulty: z.enum(['Easy', 'Medium', 'Hard', 'Insane']).optional(),
	event: z.string().optional(),
	points: z.number().optional(),
	solves: z.number().optional(),
	first_blood: z.boolean().optional(),
	cve: z.string().array().optional(),
	vuln_type: z.string().array().optional(),
	technique: z.string().array().optional(),
});

// Knowledge（知识库）frontmatter：与 WP 解耦，面向方法沉淀而非赛事
const knowledgeFields = z.object({
  topic: z.string().optional(),
	pagefind: z.boolean().optional(),
	status: z.enum(['seedling', 'budding', 'evergreen', 'published']).optional(),
	updated: z.date().optional(),
});

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: (context) => blogSchema(context).merge(writeupFields).merge(knowledgeFields),
		}),
	}),
};
