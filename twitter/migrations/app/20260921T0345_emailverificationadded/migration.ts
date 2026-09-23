#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7f1cc777f1e6cfd7cb27b6730e013ebc811b8d4c93cc057dfd510b79ad4e0307/contract';
import startContract from '../../snapshots/7f1cc777f1e6cfd7cb27b6730e013ebc811b8d4c93cc057dfd510b79ad4e0307/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f97c207c42f1479b878a42bf6e66f29306e87beb09dd771f8ce40fbed802a832/contract';
import endContract from '../../snapshots/f97c207c42f1479b878a42bf6e66f29306e87beb09dd771f8ce40fbed802a832/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'notification',
        constraint: 'notification_type_check_7d59e6d5',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'notification',
        constraint: 'notification_type_check_eeafee12',
        expression: "\"type\" IN ('POST', 'LIKE', 'REPOST', 'FOLLOW', 'REPLY')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
