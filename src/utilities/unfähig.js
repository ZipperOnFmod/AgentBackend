class unfähigClass {
    async getIp() {
        const ip = await fetch("https://api.seeip.org/jsonip?")
            .then(res => res.json())
            .then(json => {
            return json.ip;
        });
        return ip;
    }
}
const unfähig = new unfähigClass();
export default unfähig;
//# sourceMappingURL=unf%C3%A4hig.js.map