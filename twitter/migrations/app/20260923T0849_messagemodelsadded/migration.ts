#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1a782c9e686a331825378e6ed66f004ebfc40336261c18cb4ef550da712c0f6d/contract';
import endContract from '../../snapshots/1a782c9e686a331825378e6ed66f004ebfc40336261c18cb4ef550da712c0f6d/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/232a74b51a19a5c72e740ea71101564a4820823ec2ee6e1a84cd9440fdc877ca/contract';
import startContract from '../../snapshots/232a74b51a19a5c72e740ea71101564a4820823ec2ee6e1a84cd9440fdc877ca/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'conversation',
        columns: [
          col('avatar', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('conversation_type_check_88fadaa3', "\"type\" IN ('DIRECT', 'GROUP')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'conversationMember',
        columns: [
          col('conversationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('joinedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('role', 'text', {
            notNull: true,
            default: lit('MEMBER'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'conversationMember_role_check_49b83496',
            "\"role\" IN ('MEMBER', 'ADMIN')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'message',
        columns: [
          col('content', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('conversationId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('senderId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', {
            notNull: true,
            default: lit('TEXT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'message_type_check_920dd5a6',
            "\"type\" IN ('TEXT', 'IMAGE', 'VIDEO', 'FILE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'messageMedia',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('fileName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fileSize', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('messageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'messageMedia_type_check_920dd5a6',
            "\"type\" IN ('TEXT', 'IMAGE', 'VIDEO', 'FILE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'messageReaction',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('emoji', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('messageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'messageRead',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('messageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('readAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'conversationMember',
        constraint: 'conversationMember_conversationId_userId_key',
        columns: ['conversationId', 'userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'messageReaction',
        constraint: 'messageReaction_messageId_userId_emoji_key',
        columns: ['messageId', 'userId', 'emoji'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'messageRead',
        constraint: 'messageRead_messageId_userId_key',
        columns: ['messageId', 'userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'conversationMember',
        index: 'conversationMember_conversationId_idx_669215a6',
        columns: ['conversationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'conversationMember',
        index: 'conversationMember_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'message',
        index: 'message_conversationId_createdAt_idx_44d4ac61',
        columns: ['conversationId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'message',
        index: 'message_conversationId_idx_669215a6',
        columns: ['conversationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'message',
        index: 'message_senderId_idx_4689c490',
        columns: ['senderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'messageMedia',
        index: 'messageMedia_messageId_idx_3cdded8d',
        columns: ['messageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'messageReaction',
        index: 'messageReaction_messageId_idx_3cdded8d',
        columns: ['messageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'messageReaction',
        index: 'messageReaction_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'messageRead',
        index: 'messageRead_messageId_idx_3cdded8d',
        columns: ['messageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'messageRead',
        index: 'messageRead_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'conversationMember',
        foreignKey: {
          name: 'conversationMember_conversationId_fkey',
          columns: ['conversationId'],
          references: { schema: 'public', table: 'conversation', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'conversationMember',
        foreignKey: {
          name: 'conversationMember_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'message',
        foreignKey: {
          name: 'message_conversationId_fkey',
          columns: ['conversationId'],
          references: { schema: 'public', table: 'conversation', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'message',
        foreignKey: {
          name: 'message_senderId_fkey',
          columns: ['senderId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'messageMedia',
        foreignKey: {
          name: 'messageMedia_messageId_fkey',
          columns: ['messageId'],
          references: { schema: 'public', table: 'message', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'messageReaction',
        foreignKey: {
          name: 'messageReaction_messageId_fkey',
          columns: ['messageId'],
          references: { schema: 'public', table: 'message', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'messageReaction',
        foreignKey: {
          name: 'messageReaction_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'messageRead',
        foreignKey: {
          name: 'messageRead_messageId_fkey',
          columns: ['messageId'],
          references: { schema: 'public', table: 'message', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'messageRead',
        foreignKey: {
          name: 'messageRead_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
