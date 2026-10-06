---
schemaVersion: 1
locale: en
meta:
  title: Contact
  description: Share a note with Manuel Cerdas. A contact assistant helps you shape it, and you review it before sending.
conversation:
  agentName: Relay
  entryMessage: |-
    Hello. I’m {{agentName}}, Manuel’s contact assistant.

    Tell me what you’re building, what isn’t working, or what decision you’re facing. A rough description is enough; I’ll help shape it into a note for Manuel before you send it.
  degradedEntryMessage: Something on my side isn’t shaping the note properly right now. Your original words can still reach Manuel exactly as you wrote them. What’s the best email for him to reply to?
  recapIntro: Here’s the note Manuel would receive.
  recapUpdateIntro: Here’s the updated note Manuel would receive.
  replyRouteQuestion: What’s the best email for Manuel to reply to?
  replyRouteErrorMessage: Please enter an email address so Manuel can reply.
  nameQuestion: What should Manuel call you? This is optional.
  closeMessage: That’s with Manuel now. He’ll read your note and reply. If a conversation would help, you can arrange one then.
  closeMessageWithReplyWindow: That’s with Manuel now. He usually replies within {{replyWindow}}. If a conversation would help, you can arrange one then.
  entryPlaceholder: Start anywhere
  replyRoutePlaceholder: your@email.com
  namePlaceholder: Your name (optional)
  namePlaceholderNarrow: Name (optional)
  skipNameLabel: Skip name
  skipNameLabelNarrow: Skip
  nameSkippedLabel: Name skipped
  noteEditPlaceholder: Edit the note
  degradedAddendumPlaceholder: Add anything else
  confirmCorrectLabel: Edit note
  confirmAcceptLabel: Send note to Manuel
  degradedConfirmCorrectLabel: Add more
  degradedConfirmAcceptLabel: Send note to Manuel
  editIdentityLinkLabel: Edit reply details
  sendAsIsLabel: Use my original words
  continueAsWrittenLabel: Continue with what I’ve said
  deliveryRetryMessage: That didn’t go through. I’ll try again in {{retryDelaySeconds}} seconds — or you can try now.
  deliveryGiveUpMessage: That still isn’t going through. Please use the email below so this doesn’t get lost.
  starterStems:
    - I’m trying to make sense of
    - I’m weighing an engineering decision about
    - People are having trouble with
    - I’d value a perspective on
---
