#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1f15e9f4a5ba1aef678a5cddf39e708680577f46610e6cb4d3bfa1ef32cec1d1/contract';
import startContract from '../../snapshots/1f15e9f4a5ba1aef678a5cddf39e708680577f46610e6cb4d3bfa1ef32cec1d1/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d4d5750064735889f4b85a3d13926784e52757403bbec24e76f12696eaed9f45/contract';
import endContract from '../../snapshots/d4d5750064735889f4b85a3d13926784e52757403bbec24e76f12696eaed9f45/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.dropNotNull({ schema: 'public', table: 'user', column: 'password' })];
  }
}

MigrationCLI.run(import.meta.url, M);
