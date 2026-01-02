function BaseIcon(props: any) {
  return (
    <span className={"icon"}>
      {/*<span className={'hidden'}>i</span>*/}
      {props.children}
      {/*<span className={'hidden'}>i</span>*/}
    </span>
  );
}
export default BaseIcon;
