'use strict';

const chalk = require('chalk');
const Insight = require('insight');
const Generator = require('@ngx-rocket/core');
const asciiLogo = require('@ngx-rocket/ascii-logo');

const prompts = require('./prompts');
const options = require('./options.json');
const pkg = require('../../package.json');

class NgxGenerator extends Generator {
  initializing() {
    this.version = pkg.version;
    this.insight = new Insight({trackingCode: 'UA-93069862-1', pkg});

    this.argument('appName', {
      desc: 'Name of the app to generate',
      type: String,
      required: false
    });

    this.insight.optOut = !this.options.analytics || process.env.DISABLE_NGX_ANALYTICS;

    // Updating
    let fromVersion = null;

    if (this.options.update) {
      this.props = this.config.get('props') || {};
      fromVersion = this.config.get('version');
    }

    if (fromVersion) {
      if (fromVersion >= this.version) {
        this.log(chalk.green('\nNothing to update, it\'s all good!\n'));
        process.exit(0);
      }

      this.updating = true;
      this.log(`\nUpdating ${chalk.green(this.props.appName)} project (${chalk.yellow(fromVersion)} -> ${chalk.yellow(this.version)})\n`);
      this.log(`${chalk.yellow('Make sure you don\'t have uncommitted changes before overwriting files!')}`);
      this.insight.track('generator', 'update', fromVersion, 'to', this.version);
    } else if (!this.options['skip-welcome']) {
      this.log(asciiLogo());
    }

    // Composition
    const addonsOption = this.options.addons;
    this.addons = addonsOption ? addonsOption.split(' ') : [];
    this.addons.forEach(addon => this.composeWith(addon, this.options));

    this.insight.track('version', this.version);
    this.insight.track('node', process.version);
    this.insight.track('platform', process.platform);
    this.insight.track('addons', addonsOption);
  }

  prompting() {
    return super.prompting()
      .then(() => {
        this.props.mobile = this.props.mobile || [];
        this.props.webview = this.props.webview || [];
        this.shareProps(this.props);
      });
  }

  configuring() {
    this.insight.track(
      'generator',
      this.props.target,
      this.props.target.includes('cordova') ? this.props.mobile : '',
      this.props.ui,
      this.props.auth ? 'auth' : 'no-auth'
    );
  }

  install() {
    const skipInstall = this.options['skip-install'];

    if (!skipInstall) {
      this.log(`\nRunning ${chalk.yellow('npm install')}, please wait...`);
      this.npmInstall(null, {loglevel: 'error'});
    }
  }

  end() {
    if (this.updating) {
      this.log(`\nUpdated ${chalk.green(this.props.appName)} to ${chalk.yellow(this.version)} successfully!`);
      return;
    }

    this.log('\nAll done! Get started with these tasks:');
    this.log(`- $ ${chalk.green('npm start')}: start dev server with live reload on http://localhost:4200`);

    if (this.props.target.includes('web')) {
      this.log(`- $ ${chalk.green('npm run build')}: build web app for production`);
    }

    if (this.props.target.includes('cordova')) {
      this.log(`- $ ${chalk.green('npm run cordova:prepare')}: prepare for building mobile app`);
      this.log(`- $ ${chalk.green('npm run cordova:run')}: run app on device or simulator`);
      this.log(`- $ ${chalk.green('npm run cordova:build')}: build mobile app for production`);
    }

    this.log(`- $ ${chalk.green('npm test')}: run unit tests in watch mode for TDD`);
    this.log(`- $ ${chalk.green('npm run test:ci')}: lint code and run units tests with coverage`);
    this.log(`- $ ${chalk.green('npm run e2e')}: launch e2e tests`);
    this.log(`- $ ${chalk.green('npm run docs')}: show docs and coding guides`);
  }
}

module.exports = Generator.make({
  baseDir: __dirname,
  generator: NgxGenerator,
  options,
  prompts
});
