/* Draws responsive coupled loops to explain learner, system and collective development. */
(() => {
      const root=document.getElementById('capability-coupled-loops');
      if (!root) return;
      const svg=root.querySelector('.ccl-diagram');
      const NS='http://www.w3.org/2000/svg';
      const prefix='ccl';
      let lastWidth=0;
      function element(tag,attrs,parent=svg) {
        const node=document.createElementNS(NS,tag);
        for(const [name,value] of Object.entries(attrs)) node.setAttribute(name,String(value));
        parent.appendChild(node);
        return node;
      }
      function lineWidth(value,className) {
        const probe=element('text',{class:className,visibility:'hidden'});
        probe.textContent=value;
        const result=probe.getComputedTextLength();
        probe.remove();
        return result;
      }
      function wrap(value,width,className) {
        const lines=[];
        let current='';
        for(const word of value.split(' ')) {
          const candidate=current?`${current} ${word}`:word;
          if(current && lineWidth(candidate,className)>width) { lines.push(current);current=word; }
          else current=candidate;
        }
        if(current) lines.push(current);
        return lines;
      }
      function text(lines,x,y,className='ccl-label',anchor='middle',step=19) {
        const node=element('text',{x,y,class:className,'text-anchor':anchor});
        lines.forEach((value,index)=>{
          const span=element('tspan',{x,dy:index?step:0},node);
          span.textContent=value;
        });
        return node;
      }
      function path(value,feedback=false,arrow=true) {
        return element('path',{d:value,class:feedback?'ccl-return':'ccl-path',
          ...(arrow?{'marker-end':`url(#${prefix}-${feedback?'feedback':'forward'})`}:{}),
          'vector-effect':'non-scaling-stroke'});
      }
      function box(x,y,width,title,labels) {
        const titleLines=wrap(title,width-28,'ccl-title');
        const body=labels.map(label=>wrap(label,width-28,'ccl-label'));
        const height=28+titleLines.length*19+body.reduce((n,lines)=>n+lines.length*19+7,0);
        element('rect',{x,y,width,height,rx:5,class:'ccl-node'});
        let cursor=y+23;
        text(titleLines,x+width/2,cursor,'ccl-title');
        cursor+=titleLines.length*19+9;
        for(const lines of body) { text(lines,x+width/2,cursor);cursor+=lines.length*19+7; }
        return {x,y,width,height,cx:x+width/2,bottom:y+height};
      }
      function loopPlan(width,title,steps) {
        const headings=wrap(title,width-16,'ccl-title');
        const innerWidth=width-26;
        const planned=steps.map(([phase,label])=>({phase,lines:wrap(label,innerWidth-12,'ccl-label')}));
        return {headings,innerWidth,steps:planned,top:18+headings.length*19,
          stepHeight:Math.max(...planned.map(step=>34+step.lines.length*19))};
      }
      function drawLoop(x,y,width,title,steps,height,stepHeight) {
        const plan=loopPlan(width,title,steps);
        element('rect',{x,y,width,height,rx:5,class:'ccl-loop'});
        text(plan.headings,x+width/2,y+23,'ccl-title');
        const innerX=x+20;
        const nodes=[];
        for(let index=0;index<plan.steps.length;index++) {
          const step=plan.steps[index];
          const nodeY=y+plan.top+index*(stepHeight+25);
          element('rect',{x:innerX,y:nodeY,width:plan.innerWidth,height:stepHeight,rx:3,class:'ccl-node'});
          text([step.phase],innerX+plan.innerWidth/2,nodeY+19,'ccl-small');
          text(step.lines,innerX+plan.innerWidth/2,nodeY+40);
          nodes.push({x:innerX,y:nodeY,width:plan.innerWidth,height:stepHeight,cx:innerX+plan.innerWidth/2});
        }
        for(let index=0;index<2;index++) {
          const first=nodes[index],next=nodes[index+1];
          path(`M ${first.cx} ${first.y+first.height} V ${next.y-4}`);
        }
        const first=nodes[0],last=nodes[2];
        path(`M ${last.x} ${last.y+last.height/2} H ${x+9} V ${first.y+first.height/2} H ${first.x-4}`,true);
        return {x,y,width,height,cx:x+width/2,bottom:y+height,mid:y+height/2};
      }
      function drawCoupling(width,margin,shared,left,right) {
        const joint=box(margin,left.bottom+74,width-margin*2,'Joint practice: coupling at every stage',[
          'Create: shared goals, roles and controls',
          'Implement: work, learn and create together',
          'Investigate: joint gains, agency and workload']);
        path(`M ${left.cx} ${left.bottom} V ${joint.y-16} H ${joint.x+joint.width/4} V ${joint.y-4}`);
        path(`M ${right.cx} ${right.bottom} V ${joint.y-16} H ${joint.x+joint.width*3/4} V ${joint.y-4}`);
        text(['Ongoing exchange'],width/2,left.bottom+35,'ccl-small');
        path(`M ${joint.x} ${joint.y+joint.height/2} H 18 V ${left.mid} H ${left.x-4}`,true);
        path(`M ${joint.x+joint.width} ${joint.y+joint.height/2} H ${width-18} V ${right.mid} H ${right.x+right.width+4}`,true);
        text(['Revise learning'],left.cx,left.bottom-16,'ccl-small');
        text(['Revise system'],right.cx,right.bottom-16,'ccl-small');
        const collective=box(margin,joint.bottom+72,width-margin*2,'Collective capability in context',[
          'Coordinated performance · learning · learner flourishing',
          'Adoption · effective use · sustainable support',
          'Equity · access · organizational readiness']);
        path(`M ${joint.cx} ${joint.bottom} V ${collective.y-4}`);
        text(wrap('Evidence from authentic use',width/2-margin-18,'ccl-small'),width/2+12,joint.bottom+29,'ccl-small','start',16);
        path(`M ${collective.x} ${collective.y+collective.height/2} H 3 V ${shared.y+shared.height/2} H ${shared.x-4}`,true);
        const bottom=collective.bottom+34;
        text(['Reframe goals, resources and conditions'],width/2,bottom-9,'ccl-small');
        return bottom;
      }
      function draw() {
        const width=Math.max(320,Math.round(svg.getBoundingClientRect().width));
        if(width===lastWidth) return;
        lastWidth=width;
        for(const child of [...svg.children]) if(!['title','desc'].includes(child.tagName)) child.remove();
        const defs=element('defs',{});
        for(const [kind,color] of [['forward','var(--ink)'],['feedback','var(--accent)']]) {
          const marker=element('marker',{id:`${prefix}-${kind}`,viewBox:'0 0 10 10',refX:9,refY:5,
            markerWidth:7,markerHeight:7,orient:'auto'},defs);
          element('path',{d:'M 1 1 L 9 5 L 1 9 Z',fill:color},marker);
        }
        const margin=36,gap=28,columnWidth=(width-margin*2-gap)/2;
        const shared=box(margin,12,width-margin*2,'Shared challenge',[
          'Learner goals · intended capability','People · resources · operating conditions']);
        const loopY=shared.bottom+60;
        const learnerSteps=[['Create','Learning conditions'],['Implement','Teaching and practice'],['Investigate','Knowledge · skill · agency']];
        const systemSteps=[['Create','Needs and design'],['Implement','Deploy and operate'],['Investigate','Technical fit and quality']];
        const learnerPlan=loopPlan(columnWidth,'Learner development',learnerSteps);
        const systemPlan=loopPlan(columnWidth,'System evolution',systemSteps);
        const stepHeight=Math.max(learnerPlan.stepHeight,systemPlan.stepHeight);
        const top=Math.max(learnerPlan.top,systemPlan.top);
        const loopHeight=top+3*stepHeight+50+42;
        const left=drawLoop(margin,loopY,columnWidth,'Learner development',learnerSteps,loopHeight,stepHeight);
        const right=drawLoop(margin+columnWidth+gap,loopY,columnWidth,'System evolution',systemSteps,loopHeight,stepHeight);
        path(`M ${shared.cx-45} ${shared.bottom} V ${shared.bottom+12} H ${left.cx} V ${loopY-4}`);
        path(`M ${shared.cx+45} ${shared.bottom} V ${shared.bottom+12} H ${right.cx} V ${loopY-4}`);
        text(['Goals and requirements'],width/2,shared.bottom+37,'ccl-small');
        const bottom=drawCoupling(width,margin,shared,left,right);
        svg.setAttribute('viewBox',`0 0 ${width} ${bottom}`);
        svg.style.aspectRatio=`${width} / ${bottom}`;
      }
      // Font metrics can change after the first paint; rebuild wrapped labels then.
      document.fonts.ready.then(()=>{lastWidth=0;draw();});
      new ResizeObserver(draw).observe(root);
      draw();
    })();
