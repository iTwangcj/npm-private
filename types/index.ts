export interface IStorage {
    // addPackage(name: string, info: Package, callback: Callback): void;
    // removePackage(name: string, callback: Callback): void;
    // updateVersions(name: string, packageInfo: Package, callback: Callback): void;
    // addVersion(name: string, version: string, metadata: Version, tag: StringValue, callback: Callback): void;
    // mergeTags(name: string, tags: MergeTags, callback: Callback): void;
    // changePackage(name: string, metadata: Package, revision: string, callback: Callback): void;
    // removeTarball(name: string, filename: string, revision: string, callback: Callback): void;
    // addTarball(name: string, filename: string): IUploadTarball;
    // getTarball(name: string, filename: string): IReadTarball;
    // getPackageMetadata(name: string, callback: Callback): void;
    // search(startKey: string, options: any): IUploadTarball;

    getPackage(name: string): Promise<any>;
    savePackage(pkg: any): Promise<boolean>;
}