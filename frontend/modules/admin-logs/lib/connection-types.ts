// Every connection-log `type` the backend can write. There's no endpoint that
// lists them: each is the `$type` of a ConnectionService subclass in the WS
// (egov-api-ws/project/app/Services/**), so this mirrors that set by hand.
// Add here when a new outbound integration lands on the backend.
//
//   disposable_emails  — DisposableEmailService (blocklist refresh)
//   egovph             — EgovSsoService (eGov PH SSO)
//   emessage           — EmessageService (SMS/eMessage)
export const CONNECTION_TYPES = ["disposable_emails", "egovph", "emessage"] as const;
