import data from '../../../config/mock_scenarios.json';
export function GET(){return Response.json({samples:data.scenarios.map(s=>({id:s.sampleId,name:s.label,image:'/samples/'+s.file}))})}
