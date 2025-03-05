export class LocalStorageManagerManager {
    private static LOCAL_STORAGE_KEY = 'sound-manager-ts';
  
    public static setItem(key: string, value: any): void {
      const item = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      let data = item ? JSON.parse(item) : {};
      data[key] = value;
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(data));
    }
  
    public static getItem(key: string): any {
      const item = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (item) {
        const data = JSON.parse(item);
        return data[key] !== undefined ? data[key] : null;
      }
      return null;
    }
  
    public static clear(): void {
        localStorage.removeItem(this.LOCAL_STORAGE_KEY);
    }
  }