import { cloudApi } from "../../server/cloudApi.js";

export default { fetch: (request: Request) => cloudApi(request, "ai") };
