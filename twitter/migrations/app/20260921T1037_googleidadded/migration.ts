#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1f15e9f4a5ba1aef678a5cddf39e708680577f46610e6cb4d3bfa1ef32cec1d1/contract';
import endContract from '../../snapshots/1f15e9f4a5ba1aef678a5cddf39e708680577f46610e6cb4d3bfa1ef32cec1d1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/7f58c6d6fcadfd4367380c98ce3179cc789457a63b426b71624e761c6089d068/contract';
import startContract from '../../snapshots/7f58c6d6fcadfd4367380c98ce3179cc789457a63b426b71624e761c6089d068/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('googleId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_googleId_key',
        columns: ['googleId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
