export namespace backend {
	
	export class FileOperationResult {
	    status: string;
	    path?: string;
	
	    static createFrom(source: any = {}) {
	        return new FileOperationResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status = source["status"];
	        this.path = source["path"];
	    }
	}
	export class ReleaseInfo {
	    version: string;
	    schemaVersion: number;
	    desktop: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ReleaseInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.schemaVersion = source["schemaVersion"];
	        this.desktop = source["desktop"];
	    }
	}
	export class SafeHistoryEntry {
	    id: number;
	    label: string;
	    dataType: string;
	    exportFormat: string;
	    filename: string;
	    // Go type: time
	    createdAt: any;
	
	    static createFrom(source: any = {}) {
	        return new SafeHistoryEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.label = source["label"];
	        this.dataType = source["dataType"];
	        this.exportFormat = source["exportFormat"];
	        this.filename = source["filename"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TemplateDocument {
	    id: string;
	    name: string;
	    settingsJson: string;
	    logoBase64?: string;
	    backgroundBase64?: string;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new TemplateDocument(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.settingsJson = source["settingsJson"];
	        this.logoBase64 = source["logoBase64"];
	        this.backgroundBase64 = source["backgroundBase64"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TemplateSaveRequest {
	    id: string;
	    name: string;
	    settingsJson: string;
	    logoData?: number[];
	    backgroundData?: number[];
	    preserveLogo: boolean;
	    preserveBackground: boolean;
	
	    static createFrom(source: any = {}) {
	        return new TemplateSaveRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.settingsJson = source["settingsJson"];
	        this.logoData = source["logoData"];
	        this.backgroundData = source["backgroundData"];
	        this.preserveLogo = source["preserveLogo"];
	        this.preserveBackground = source["preserveBackground"];
	    }
	}

}

export namespace database {
	
	export class Template {
	    id: string;
	    name: string;
	    settingsJson: string;
	    logoData?: number[];
	    backgroundData?: number[];
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new Template(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.settingsJson = source["settingsJson"];
	        this.logoData = source["logoData"];
	        this.backgroundData = source["backgroundData"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace services {
	
	export class TemplateError {
	    index: number;
	    name?: string;
	    reason: string;
	
	    static createFrom(source: any = {}) {
	        return new TemplateError(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.index = source["index"];
	        this.name = source["name"];
	        this.reason = source["reason"];
	    }
	}
	export class TemplateImportResult {
	    total: number;
	    imported: number;
	    skipped: number;
	    failed: TemplateError[];
	
	    static createFrom(source: any = {}) {
	        return new TemplateImportResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total = source["total"];
	        this.imported = source["imported"];
	        this.skipped = source["skipped"];
	        this.failed = this.convertValues(source["failed"], TemplateError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TemplateSummary {
	    id: string;
	    name: string;
	    settingsJson: string;
	    hasLogo: boolean;
	    hasBackground: boolean;
	    // Go type: time
	    createdAt: any;
	    // Go type: time
	    updatedAt: any;
	
	    static createFrom(source: any = {}) {
	        return new TemplateSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.settingsJson = source["settingsJson"];
	        this.hasLogo = source["hasLogo"];
	        this.hasBackground = source["hasBackground"];
	        this.createdAt = this.convertValues(source["createdAt"], null);
	        this.updatedAt = this.convertValues(source["updatedAt"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

