import Dialog, { DialogTitle } from '@/components/Dialog'
import Modal from '@/components/Modal'

export default function TermsOfUseDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <Modal
      isDismissable
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
    >
      <Dialog className="max-h-[calc(100vh-2rem)] overflow-auto">
        <DialogTitle className="text-bc-h4 mt-0 pr-8">Terms of Use</DialogTitle>
        <h3 className="text-center">Version 1.0, May 19th, 2020</h3>
        <p>
          The &quot;Book an Appointment&quot; application (the
          &quot;Service&quot;) allows you, the user, to book an appointment at a
          Service BC location for services offered at that location.
        </p>
        <p>
          These Terms of Use are an agreement between you and Her Majesty the
          Queen in Right of the Province of British Columbia, represented by the
          Minister of Citizens&apos; Services, IDIM (the &quot;Province&quot;),
          and govern your use of the Service. By indicating that you agree to
          these Terms of Use, and in consideration of the use of the Service,
          you agree to the following:
        </p>
        <TermsSection title="1. Authority and Ability to Accept Terms of Use">
          In order to accept these Terms of Use and use the Service, you must:
          (a) have a BCeID or a BC Service Card; and (b) be at least 19 years of
          age.
        </TermsSection>
        <TermsSection title="2. Responsibility for Use">
          You are solely responsible for your use of the Service, including
          without limitation for taking reasonable precautions to ensure that
          any information that you provide in connection with your use of the
          Service (such as your BCeID, your BC Services Card number, and any
          personal information) is kept confidential.
        </TermsSection>
        <TermsSection title="3. Ownership">
          The Service, the website through which the Service is accessed, and
          all other information and works made available, displayed or
          transmitted in connection with the Service, including without
          limitation data, text, audio, video, trademarks, trade names, logos,
          domain names, images, graphics, graphical user interface elements and
          designs, in any form or medium whatsoever (collectively, the
          &quot;Content&quot;), are owned by the Province or its licensors and
          are protected by copyright, patent, trademark and other laws
          protecting intellectual property rights.
        </TermsSection>
        <TermsSection title="4. Licence">
          Subject to your compliance with these Terms of Use, the Province
          grants you a non-exclusive, revocable, limited license to access and
          use the Service and the Content solely as necessary for you to book
          and manage your appointments. You must not copy, distribute,
          republish, transmit or otherwise exploit any part of the Service or
          the Content, and the Province expressly reserves all intellectual
          property rights in and to the Service and the Content. If your use of
          the Service is terminated under section 5, your license is
          automatically terminated.
        </TermsSection>
        <TermsSection title="5. Suspension or Termination">
          The Province may at any time, in its sole discretion, suspend or
          terminate your use of the Service, in whole or in part: (a) if you
          fail to comply with any provision of these Terms of Use; (b) as a
          security measure; or (c) for administrative purposes.
        </TermsSection>
        <TermsSection title="6. Changes to Service and/or Terms of Use">
          The Province may at any time, in its sole discretion and without
          direct notice to you: (a) discontinue the Service; or (b) make changes
          to the Service and/or these Terms of Use. By continuing to use the
          Service, you will be conclusively deemed to have accepted any changes
          to these Terms of Use.
        </TermsSection>
        <TermsSection title="7. Acceptable Use">
          You must not take any action in connection with your use of the
          Service that would jeopardize the security, integrity and/or
          availability of the Service, including using the Service for an
          unlawful purpose, copying associated software, tampering with the
          Service, transmitting harmful code, conducting hacking activities,
          circumventing security measures, adversely affecting other users, or
          removing proprietary notices.
        </TermsSection>
        <TermsSection title="8. Privacy">
          When you use the Service, personal information that you have entered
          to log in with your BCeID or BC Services Card is collected by the
          Ministry of Citizens&apos; Services via the Service. The authority for
          the collection of this information is sections 26(c), 27(1)(b),
          33.1(5) and 33.2(a) of the Freedom of Information and Protection of
          Privacy Act. Questions can be directed to: Director, Service Delivery,
          PO BOX 9412 STN PROV GOVT, Victoria, BC, V8W 9V1, 1 800 663-7867.
        </TermsSection>
        <TermsSection title='9. Service Provided "As Is"'>
          The Service is provided to you &quot;as is&quot;, and the Province
          disclaims all representations, warranties, conditions, obligations and
          liabilities of any kind, whether express or implied. The Province does
          not represent or warrant that the Service will be available, timely,
          uninterrupted or error free, that errors will be corrected, or that
          the Service will meet your expectations and requirements.
        </TermsSection>
        <TermsSection title="10. No Liability">
          To the maximum extent permitted by applicable law, under no
          circumstances will the Province be liable for any direct, indirect,
          special, incidental, consequential or other loss, claim, injury or
          damage arising out of or connected with your use of the Service,
          whether based on contract, tort, strict liability or any other legal
          theory.
        </TermsSection>
        <TermsSection title="11. Indemnity">
          You agree to indemnify, defend and hold harmless the Province and the
          Province&apos;s employees and agents from and against all claims,
          demands, obligations, losses, liabilities, costs or debts, and
          expenses arising from your use of the Service or your violation of any
          provision of these Terms of Use.
        </TermsSection>
        <TermsSection title="12. General">
          These Terms of Use are the entire agreement between you and the
          Province with respect to their subject matter. If any provision is
          invalid, illegal or unenforceable, that provision will be severed and
          all other provisions will remain in effect. These Terms of Use are
          governed by the laws of British Columbia and Canada. You consent to
          the exclusive jurisdiction and venue of the courts of British Columbia
          sitting in Victoria.
        </TermsSection>
      </Dialog>
    </Modal>
  )
}

function TermsSection({
  children,
  title,
}: {
  children: string
  title: string
}) {
  return (
    <section>
      <h4>{title}</h4>
      <p>{children}</p>
    </section>
  )
}
