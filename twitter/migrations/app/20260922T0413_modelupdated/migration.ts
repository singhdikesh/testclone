#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/28ff7ac04dfc5c477870e40d98ca39f6a8a20df8072a0855898d592587cc670c/contract';
import endContract from '../../snapshots/28ff7ac04dfc5c477870e40d98ca39f6a8a20df8072a0855898d592587cc670c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/8ea797c03c312dd1f11f43797e74788b54ec8971e3081a1d147116fe6e909505/contract';
import startContract from '../../snapshots/8ea797c03c312dd1f11f43797e74788b54ec8971e3081a1d147116fe6e909505/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, placeholder } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'postMedia',
        column: col('userId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-postMedia-userId', {
        check: () => placeholder('backfill-postMedia-userId:check'),
        run: () => placeholder('backfill-postMedia-userId:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'postMedia', column: 'userId' }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'postMedia',
        constraint: 'postMedia_type_check_c8d14ba3',
        expression: "\"type\" IN ('IMAGE', 'VIDEO')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'postView',
        constraint: 'postView_postId_userId_key',
        columns: ['postId', 'userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'postMedia',
        index: 'postMedia_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'postMedia',
        foreignKey: {
          name: 'postMedia_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
