import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const profiles = sqliteTable('profiles', {
 id: text('id').primaryKey(), name: text('name').notNull(), shareId: text('share_id').notNull().unique(), isPublic: integer('is_public').notNull().default(0), createdAt: text('created_at').notNull(),
});
export const sessions = sqliteTable('sessions', {
 id: text('id').primaryKey(), owner: text('owner').notNull(), name: text('name').notNull(), code: text('code').notNull().unique(), date: text('date').notNull(),
});
export const members = sqliteTable('members', {
 id: text('id').primaryKey(), sessionId: text('session_id').notNull().references(()=>sessions.id), userId: text('user_id').notNull(),
}, t=>[uniqueIndex('member_unique').on(t.sessionId,t.userId)]);
export const bottles = sqliteTable('bottles', {
 id: text('id').primaryKey(), owner: text('owner').notNull(), sessionId: text('session_id').references(()=>sessions.id), name: text('name').notNull(), producer: text('producer').notNull(), vintage: text('vintage').notNull(), style: text('style').notNull(), region: text('region').notNull(), count: integer('count').notNull().default(1), drinkFrom: text('drink_from').notNull(), drinkTo: text('drink_to').notNull(), createdAt: text('created_at').notNull(), photoKey: text('photo_key'),
});
export const tastings = sqliteTable('tastings', {
 id: text('id').primaryKey(), userId: text('user_id').notNull(), bottleId: text('bottle_id').notNull().references(()=>bottles.id), date: text('date').notNull(), score: real('score').notNull(), notes: text('notes').notNull(), axes: text('axes').notNull(), createdAt: text('created_at').notNull(),
});
