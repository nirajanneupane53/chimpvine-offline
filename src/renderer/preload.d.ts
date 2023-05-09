import { AnyPtrRecord } from 'dns';
import { ElectronHandler } from 'main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler;
  }

  interface InteractiveItem {
    name: string;
    link: string;
  }

  interface InteractiveHeading {
    Heading: string;
    interactive_items: InteractiveItem[];
  }

  interface Items {
    grade: any;
    subject: string;
    Interactive: InteractiveHeading[];
  }

  interface NodeRequire {
    context: any;
  }
  // interface NodeRequire {
  //   context: (
  //     directory: string,
  //     useSubdirectories?: boolean,
  //     regExp?: RegExp
  //   ) => any;
  // }
}

export {};
