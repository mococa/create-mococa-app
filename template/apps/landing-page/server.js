import Nullstack from 'nullstack';

import Application from './src/Application';

const context = Nullstack.start(Application);
context.project.name = '{{PROJECT_NAME}}';
context.project.shortName = '{{PROJECT_NAME}}';
context.project.backgroundColor = '#FFFFFF';
context.project.color = '#000000';
context.project.domain = 'localhost';

context.start = async function start() {
  // https://nullstack.app/application-startup
};

export default context;
