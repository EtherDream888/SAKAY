import re

with open('apps/lgu-portal/src/services/adminApiService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "      let verificationStatus: DriverRecord['verificationStatus'];"
end_marker = "        const documents = ["

if start_marker not in content or end_marker not in content:
    print("Markers not found!")
    exit(1)

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

new_block = """      // Parse faulty and verified lists if driver has rejection_comment with JSON
      let faultyList: string[] = [];
      let verifiedList: string[] = [];
      const rawComment = verif?.rejection_comment || d.rejection_comment;
      if (rawComment && rawComment.startsWith('{')) {
        try {
          const parsed = JSON.parse(rawComment);
          if (Array.isArray(parsed.faultyDocuments)) {
            faultyList = parsed.faultyDocuments;
          } else if (Array.isArray(parsed.issues)) {
            faultyList = parsed.issues.map((i: any) => i.documentType);
          }
          if (Array.isArray(parsed.verifiedDocuments)) {
            verifiedList = parsed.verifiedDocuments;
          }
        } catch {}
      }

      const getDocStatus = (docType: string): 'Verified' | 'Pending Inspection' | 'Resubmission Required' | 'Resubmitted (Awaiting Review)' => {
        if (isFullyApproved) return 'Verified';
        if (verifiedList.includes(docType)) return 'Verified';
        if (isResubmitted && faultyList.includes(docType)) return 'Resubmitted (Awaiting Review)';
        if (faultyList.includes(docType) && !isResubmitted) return 'Resubmission Required';
        return 'Pending Inspection';
      };

      const docStatuses = [
        getDocStatus('license'),
        getDocStatus('mtop'),
        getDocStatus('tricycle'),
        getDocStatus('selfie')
      ];

      let verificationStatus: DriverRecord['verificationStatus'];
      let lguVerificationStatus: DriverRecord['lguVerificationStatus'];
      let accountStatus: DriverRecord['accountStatus'];

      if (isFullyApproved) {
        verificationStatus = 'Verified';
        lguVerificationStatus = 'Verified';
        accountStatus = 'Active';
      } else if (isSuspended) {
        verificationStatus = 'Suspended';
        lguVerificationStatus = 'Suspended';
        accountStatus = 'Inactive';
      } else if (isRejected) {
        verificationStatus = 'Rejected';
        lguVerificationStatus = 'Rejected';
        accountStatus = 'Inactive';
      } else {
        if (docStatuses.includes('Resubmission Required')) {
          verificationStatus = 'Resubmission Required';
          lguVerificationStatus = 'Resubmission Required';
          accountStatus = 'Inactive';
        } else if (docStatuses.includes('Resubmitted (Awaiting Review)')) {
          verificationStatus = 'Resubmitted (Awaiting Review)';
          lguVerificationStatus = 'Resubmitted (Awaiting Review)';
          accountStatus = 'Inactive';
        } else if (docStatuses.includes('Pending Inspection')) {
          verificationStatus = isTodaEndorsed ? 'Endorsed to LGU' : 'Pending';
          lguVerificationStatus = isTodaEndorsed ? 'Endorsed to LGU' : 'Pending';
          accountStatus = 'Inactive';
        } else {
          verificationStatus = isTodaEndorsed ? 'Endorsed to LGU' : 'Pending';
          lguVerificationStatus = isTodaEndorsed ? 'Endorsed to LGU' : 'Pending';
          accountStatus = 'Inactive';
        }
      }

      const authId = d.auth_user_id;
      const licFrontPath = verif?.license_front_photo_path || (authId ? `${authId}/license_front.jpg` : null);
      const licBackPath = verif?.license_back_photo_path || (authId ? `${authId}/license_back.jpg` : null);
      const mtopPath = verif?.mtop_photo_path || (authId ? `${authId}/mtop.jpg` : null);
      const tricyclePath = verif?.tricycle_photo_path || d.tricycle_photo_path || (authId ? `${authId}/tricycle.jpg` : null);
      const selfiePath = verif?.face_photo_path || (authId ? `${authId}/selfie.jpg` : null);

      const [licFrontUrl, licBackUrl, mtopUrl, tricycleUrl, selfieUrl] = await Promise.all([
        resolveStorageDocUrl('driver-licenses', licFrontPath),
        resolveStorageDocUrl('driver-licenses', licBackPath),
        resolveStorageDocUrl('mtop-permits', mtopPath, 'driver-licenses'),
        resolveStorageDocUrl('mtop-permits', tricyclePath, 'driver-licenses'),
        resolveStorageDocUrl('driver-selfies', selfiePath, 'driver-licenses'),
      ]);

"""

new_content = content[:start_idx] + new_block + content[end_idx:]

with open('apps/lgu-portal/src/services/adminApiService.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Replacement successful')
