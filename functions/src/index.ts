import * as admin from "firebase-admin";
import {setGlobalOptions} from "firebase-functions";

admin.initializeApp();
setGlobalOptions({maxInstances: 10});

export {validateInvitation, acceptInvitation} from "./accept-invitation.js";
export {createManagedUser} from "./create-managed-user.js";
export {provisionDepartment} from "./provision-department.js";

// Cycles module
export {createSaison} from "./create-saison.js";
export {markCotisationPaid} from "./mark-cotisation-paid.js";
export {forceCloseCycle} from "./force-close-cycle.js";
export {openNextCycle} from "./open-next-cycle.js";
export {confirmReception} from "./confirm-reception.js";
export {closeCycleCron} from "./close-cycle-cron.js";

// Notifications module
export {j5RemindCron} from "./j5-reminder-cron.js";

// Caisse module
export {addTransaction} from "./add-transaction.js";

// Super Admin interventions
export {rejectDepartmentRequest} from "./reject-department-request.js";
export {forceSaisonClose} from "./force-saison-close.js";
export {excludeMember} from "./exclude-member.js";
