import * as admin from 'firebase-admin';
import { setGlobalOptions } from 'firebase-functions';

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

export { validateInvitation, acceptInvitation } from './accept-invitation';
export { createManagedUser } from './create-managed-user';
export { provisionDepartment } from './provision-department';
