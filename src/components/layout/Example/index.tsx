import { View, Text, ViewStyle } from 'react-native';
import { useEffect } from 'react'
import {CoolExternalType} from "./types";

export interface ExampleProps {
    stringProp?: string;
    numberProp?: number;
    booleanProp?: boolean;
    objectProp: object;
    arrayProp?: any[];
    newProp: string;
    style?: ViewStyle;
    testID?: string;
}


const Example = ({ stringProp = 'hello', numberProp = 0, newProp, booleanProp, objectProp, arrayProp, style, testID }: ExampleProps) => {
    return (
        <View style={style} testID={testID || 'hello5'}>
            {stringProp && (<Text>{stringProp}</Text>)}
            <Text testID={'hello6'}>{numberProp.toString()}</Text>
            <Text testID={'hello4'}>{newProp}</Text>
            <Text testID={'hello3'}>{booleanProp?.toString()}</Text>
            <Text testID={'hello'}>{JSON.stringify(objectProp)}</Text>
            <Text testID={'hello5'}>{JSON.stringify(arrayProp)}</Text>
        </View>
    );
};

const ChildComponent = ({ one, two, three = 'brap', testID }: CoolExternalType) => {
    return (
        <View testID={testID}>
            <Text>{one}</Text>
            <Text>{two}</Text>
            <Text>{three}</Text>
        </View>
    );
};

export { Example, ChildComponent };
