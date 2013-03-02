var CommonMap = {
  patterns: [
    {
      trigger: {
        func: '<Anonymous>',
        line: 1,
      },
      type: 'eval-js-file',
      handle: function(ctx) {

      },
    },
  ],
};

const GELOPT = 'gaia-email-opt.js';
var EmailMap = {
  patterns: [
    {
      trigger: {
        func: 'req',
        file: GELOPT,
      },
      // the almond loader and define() frames are very boring
      boring: [
        { func: 'main' },
        { func: 'callDep' },
        { func: 'define' },
      ],
    },
    {
      trigger: {
        func: 'App.showMessageViewOrSetup'
      },
    },
    {
      trigger: {
        func: 'Cards.pushCard',
        file: 'mail-common.js',
      },
      // The specific card being created should be a source of blame.
      blameFrames: {
        'SetupAccountInfoCard': {},
        'SetupManualConfig': {},
        'SetupProgressCard': {},
        'SetupDoneCard': {},
        'SetupFixPassword': {},
        'SetupFixGmailImap': {},

        'SettingsMain': {},
        'SettingsAccountCard': {},
        'SettingsAccountCredentialsCard': {},
        'SettingsAccountServerCard': {},
        'SettingsDebugCard': {},

        'FolderPickerCard': {},

        'MessageListCard': {},
        'MessageReaderCard': {},

        'ComposeCard': {},
      },
    },
  ]
};
