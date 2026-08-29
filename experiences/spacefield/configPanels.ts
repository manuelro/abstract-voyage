import { defineConfigScopeRegistry } from '../../components/Panel/config';
import { SPACEFIELD_PANEL, SPACEFIELD_SCOPE_ID } from './SpacefieldBackground/config/panel';

export const spacefieldConfigPanelRegistry = defineConfigScopeRegistry({
  [SPACEFIELD_SCOPE_ID]: SPACEFIELD_PANEL,
});
